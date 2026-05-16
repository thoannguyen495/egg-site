import { useEffect, useRef, useState } from 'react';

// OpenStreetMap Nominatim public endpoint. Usage policy:
//   - Max ~1 request/second (we debounce 350ms below).
//   - Heavy or commercial use requires self-hosting.
//   - Browsers send User-Agent automatically; we also send Accept-Language.
// https://operations.osmfoundation.org/policies/nominatim/
const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search';
const DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 3;

// onChange(text, place|null):
//   - place is { placeId, name, address, lat, lng } when the user picks a suggestion
//   - place is null when the user types manually (clears stale coords on parent)
export default function PlaceAutocompleteInput({
  value,
  onChange,
  placeholder,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // After the user clicks a suggestion we get a fresh `value` (the address)
  // and we want to skip the search that would otherwise fire on it.
  const skipNextSearchRef = useRef(false);
  const blurTimerRef = useRef(null);

  useEffect(() => {
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }

    const query = value.trim();
    if (query.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const url = `${NOMINATIM_SEARCH}?q=${encodeURIComponent(
          query
        )}&format=json&addressdetails=1&limit=5`;
        const res = await fetch(url, {
          headers: { 'Accept-Language': navigator.language || 'en' },
        });
        const data = await res.json();
        if (cancelled) return;
        setSuggestions(Array.isArray(data) ? data : []);
        setIsOpen(true);
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value]);

  function pick(item) {
    const place = {
      placeId: String(item.place_id || ''),
      name: item.name || (item.display_name || '').split(',')[0]?.trim() || '',
      address: item.display_name || '',
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    };
    skipNextSearchRef.current = true;
    onChange(place.address, place);
    setSuggestions([]);
    setIsOpen(false);
  }

  function handleFocus() {
    clearTimeout(blurTimerRef.current);
    if (suggestions.length > 0) setIsOpen(true);
  }

  function handleBlur() {
    // Delay so a click on a suggestion can fire before we close the list.
    blurTimerRef.current = setTimeout(() => setIsOpen(false), 150);
  }

  return (
    <div className="autocomplete">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value, null)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        autoComplete="off"
      />
      {loading && <span className="autocomplete__loading">Searching…</span>}
      {isOpen && suggestions.length > 0 && (
        <ul className="autocomplete__list" role="listbox">
          {suggestions.map((s) => {
            const parts = (s.display_name || '').split(',');
            const main = (parts[0] || s.display_name || '').trim();
            const rest = parts.slice(1).join(',').trim();
            return (
              <li key={s.place_id} role="option">
                <button
                  type="button"
                  className="autocomplete__item"
                  // onMouseDown (not onClick) so it fires before the input's onBlur.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(s);
                  }}
                >
                  <strong>{main}</strong>
                  {rest && <span className="dim"> · {rest}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
