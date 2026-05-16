import { useState } from 'react';
import PlaceAutocompleteInput from './PlaceAutocompleteInput.jsx';
import MapView from './MapView.jsx';

const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';

// Place shape stored on form/ride:
//   { placeId, name, address, lat, lng }
// Or null when the user has not picked / geolocated anything yet.

export default function RideForm({ values, onChange, onSubmit }) {
  const [error, setError] = useState('');
  const [geoStatus, setGeoStatus] = useState({ state: 'idle', message: '' });

  function set(field, value) {
    onChange({ ...values, [field]: value });
  }

  function setPickup(text, place) {
    onChange({ ...values, pickupArea: text, pickupPlace: place });
  }

  function setDestination(text, place) {
    onChange({ ...values, destination: text, destinationPlace: place });
  }

  async function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setGeoStatus({
        state: 'error',
        message: 'Geolocation is not supported by this browser.',
      });
      return;
    }
    setGeoStatus({ state: 'locating', message: '' });
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          maximumAge: 60000,
        });
      });
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      let label = '';
      let place = null;
      try {
        const url = `${NOMINATIM_REVERSE}?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
        const res = await fetch(url, {
          headers: { 'Accept-Language': navigator.language || 'en' },
        });
        const data = await res.json();
        if (data?.display_name) {
          label = data.display_name;
          place = {
            placeId: String(data.place_id || ''),
            name:
              data.name ||
              (data.display_name || '').split(',')[0]?.trim() ||
              '',
            address: data.display_name,
            lat,
            lng,
          };
        }
      } catch {
        // ignore — we'll fall back to raw coords below
      }

      if (!label) label = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      if (!place) place = { placeId: '', name: '', address: label, lat, lng };

      setPickup(label, place);
      setGeoStatus({ state: 'idle', message: '' });
    } catch (err) {
      let message = 'Could not get your location.';
      if (err && err.code === 1) {
        message = 'Location permission denied. Type the pickup area instead.';
      } else if (err && err.code === 2) {
        message = 'Your location is unavailable right now.';
      } else if (err && err.code === 3) {
        message = 'Locating timed out. Try again.';
      }
      setGeoStatus({ state: 'error', message });
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (
      !values.name.trim() ||
      !values.pickupArea.trim() ||
      !values.destination.trim() ||
      !values.date ||
      !values.time
    ) {
      setError('Please fill in name, pickup, destination, date, and time.');
      return;
    }
    setError('');
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="ride-form card">
      <h2>Post a ride</h2>
      <p className="hint">
        We'll show you matching groups and individuals before you commit.
      </p>

      <div className="row">
        <label>
          Your name
          <input
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Alex"
            autoComplete="off"
          />
        </label>
      </div>

      <div className="row">
        <label>
          Pickup
          <PlaceAutocompleteInput
            value={values.pickupArea}
            onChange={setPickup}
            placeholder="Start typing an address or place…"
          />
        </label>
        <div className="form-actions-row">
          <button
            type="button"
            className="link-button"
            onClick={handleUseCurrentLocation}
            disabled={geoStatus.state === 'locating'}
          >
            {geoStatus.state === 'locating'
              ? '📍 Locating…'
              : '📍 Use my current location'}
          </button>
          {geoStatus.state === 'error' && (
            <span className="geo-error">{geoStatus.message}</span>
          )}
        </div>
      </div>

      <div className="row">
        <label>
          Destination
          <PlaceAutocompleteInput
            value={values.destination}
            onChange={setDestination}
            placeholder="Start typing an address or place…"
          />
        </label>
      </div>

      <MapView
        pickup={values.pickupPlace}
        destination={values.destinationPlace}
      />

      <div className="row two-col">
        <label>
          Date
          <input
            type="date"
            value={values.date}
            onChange={(e) => set('date', e.target.value)}
          />
        </label>
        <label>
          Departure time
          <input
            type="time"
            value={values.time}
            onChange={(e) => set('time', e.target.value)}
          />
        </label>
      </div>

      <div className="row">
        <label>
          Notes (optional)
          <textarea
            value={values.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Two suitcases, happy to split parking"
          />
        </label>
      </div>

      {error && <div className="error">{error}</div>}

      <button type="submit" className="primary">
        Find my group
      </button>
    </form>
  );
}
