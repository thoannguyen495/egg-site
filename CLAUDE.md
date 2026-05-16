# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this app is

Egg Rides is a React + Vite single-page app for coordinating informal ride-shares. Users post a ride (name, pickup, destination, date, time, notes); the app shows them matching groups and people before they commit, and they explicitly choose to join an existing group or start their own. Location features are powered by free OpenStreetMap services — **no API keys required**. All app data lives in browser `localStorage`; there is no backend.

## Commands

- `npm install` — install dependencies
- `npm run dev` — start the Vite dev server (default <http://localhost:5173>) with HMR
- `npm run build` — production build into `dist/`
- `npm run preview` — preview the production build

No tests or lint configured.

## Architecture

### Three views, one flat App.jsx

`App.jsx` owns everything and renders one of three views via a `view` state variable:

- `'home'` — form + list of existing groups
- `'results'` — Results view (Groups tab, People tab, map preview with route line, action buttons). Entered when the user submits the form. Has a `draft` ride that is **not yet** in the rides array.
- `'detail'` — GroupDetail for a specific group (Approve / Decline / Remove).

A draft becomes a real ride only on **Request to join** (status `'pending'`, group id of the existing group) or **Post my ride as a new group** (status `'confirmed'`, new group id). **Back to form** discards the draft but preserves form values.

### Form state is lifted

`formValues` lives in `App.jsx`, not in `RideForm`. That's why navigating to Results and back doesn't wipe input. `RideForm` is a controlled component receiving `{ values, onChange, onSubmit }`.

### Ride data model (v3)

```js
{
  id, name,
  pickupArea,        // editable display text (string)
  pickupPlace,       // { placeId, name, address, lat, lng } | null
  destination,
  destinationPlace,  // same shape
  date: 'YYYY-MM-DD', time: 'HH:MM', notes,
  createdAt, groupId,
  status: 'confirmed' | 'pending'
}
```

A "group" is the set of rides sharing a `groupId`. No separate group record. `getGroups(rides)` (in `src/lib/grouping.js`) buckets rides by `groupId` and returns one descriptor per group. Anchor for display is the earliest confirmed member, falling back to the earliest member overall.

Coordinates are **stored but not yet used for matching** — `ridesMatch` is pure text similarity. The plumbing is there for a future swap to distance-based matching by rewriting `placeSimilar` in `src/lib/grouping.js`.

### Matching algorithm: `src/lib/grouping.js`

`ridesMatch(a, b)` is true iff all three hold:

1. `placeSimilar(destination)` — case/punctuation-insensitive equality, substring containment, or any shared token of length ≥ 3.
2. `placeSimilar(pickupArea)` — same rule.
3. `timeClose` — same date, departure timestamps within `TIME_WINDOW_MINUTES` (default 45).

Results view helpers:

- `findMatchingGroups(draft, groups)` → groups containing any member that matches via `ridesMatch` (strict: dest + pickup + time).
- `findMatchingPeople(draft, rides)` → rides whose destination is similar to the draft's (loose: destination only).

### Location stack (OpenStreetMap-based)

Three free public services, no API key:

| Service | Used by | Endpoint |
|---|---|---|
| OpenStreetMap tiles | `MapView` map background | `tile.openstreetmap.org` |
| Nominatim | `PlaceAutocompleteInput`, geolocation reverse-geocode | `nominatim.openstreetmap.org` |
| OSRM | `RouteLine` driving polyline | `router.project-osrm.org` |

All three have community-run rate limits. We debounce Nominatim search (350 ms) and only call OSRM once per `(pickup, destination)` pair. If you grow past personal-project scale, swap in a paid/self-hosted alternative — the call sites are isolated (`PlaceAutocompleteInput` for Nominatim search, `RideForm.handleUseCurrentLocation` for reverse geocode, `MapView` `RouteLine` for OSRM).

### Component breakdown

- **`PlaceAutocompleteInput`** — controlled text input with a Nominatim-backed dropdown.
  - Debounced 350 ms; minimum 3 chars before fetching.
  - `onChange(text, place)` — `place` is `{ placeId, name, address, lat, lng }` on pick, `null` on manual typing.
  - Uses a `skipNextSearchRef` flag to avoid re-searching the value we just inserted on suggestion pick.
  - `onMouseDown` (not `onClick`) for suggestion items so the click fires before the input's `onBlur`.

- **`MapView`** — `react-leaflet` `<MapContainer>` with OSM tiles. Branches:
  - No coords → `.map-placeholder` card with prompt text.
  - Coords present → live map with `<Marker>`s using `L.divIcon` colored circles (no image assets to bundle) and, if both endpoints exist, a `<Polyline>` from `RouteLine`.
  - Inner `FitToMarkers` uses `useMap()` and `map.fitBounds()` to keep both pins in view.
  - Inner `RouteLine` fetches OSRM `driving` route; falls back to a straight `[[lat,lng],[lat,lng]]` polyline on any error.

- **`RideForm`** — controlled form. Always uses `PlaceAutocompleteInput` (no API-key conditional anymore). The "Use my current location" button calls browser Geolocation, then reverse-geocodes via Nominatim to build a Place struct.

### Why divIcon for markers?

Leaflet's default `<Marker>` icon is a PNG that breaks with bundlers (it's referenced via relative URL). Using `L.divIcon` with inline-styled HTML circles sidesteps the asset-path problem and gives us themed pins (green pickup, yellow destination) for free.

### Messages

Flat array in localStorage, key `egg-messages-v1`.

```js
{ id, from, toName?, toGroupId?, text, createdAt }
```

`from` is the draft user's name (no real auth — name-based identification is enough for an MVP). The `MessageModal` shows the thread for the current target. **Sending a message does not commit the draft ride** — it just appends a message. The modal is keyed in `App.jsx` by `${type}-${name|groupId}` so opening a new target remounts and refreshes the prefill text.

### Storage & migrations

`src/lib/storage.js` keys, newest first:

- `egg-rides-v3` — current shape, with `pickupPlace` / `destinationPlace` Place structs
- `egg-rides-v2` — had `pickupCoords` / `destinationCoords` `{lat,lng}`; auto-migrated to v3 by wrapping each coord pair in a synthetic Place
- `egg-rides-v1` — pre-`groupId` rides; auto-migrated to give each its own group
- `egg-messages-v1` — messages

When changing the ride shape in a non-additive way, **bump the key** to v4 and add a migration branch in `loadRides`.

### File layout

```
src/
├── App.jsx                    owns state, picks the view
├── App.css                    all component styles
├── index.css                  CSS variables + base resets
├── main.jsx                   entry; imports leaflet's CSS
├── components/
│   ├── RideForm.jsx                  controlled form + geolocation + map preview
│   ├── PlaceAutocompleteInput.jsx    Nominatim-backed autocomplete with dropdown
│   ├── MapView.jsx                   react-leaflet map + markers + route line
│   ├── GroupList.jsx                 home-view list of all groups
│   ├── GroupCard.jsx                 clickable summary card (home only)
│   ├── GroupDetail.jsx               members + pending + approve/decline/remove
│   ├── ResultsView.jsx               draft summary, map+route, tabs, action buttons
│   └── MessageModal.jsx              mock chat modal
└── lib/
    ├── storage.js     load/save rides + messages, v1/v2 migrations
    ├── grouping.js    normalize, placeSimilar, timeClose, ridesMatch, getGroups,
    │                  findMatchingGroups, findMatchingPeople
    └── format.js      date/time display helpers

design/
└── stitch-prompt.json   design spec for AI UI generators (Google Stitch, etc.)
```

## Conventions

- Function components with hooks. No class components.
- `.jsx` for components; `.js` for logic-only modules.
- `src/lib/*` stays pure: no React imports, no DOM, no network. All HTTP lives in components.
- All state lives in `App.jsx`. Children are presentational and receive callbacks via props.
- Be polite to public OSM services: keep debounces in place, don't poll, cache when reasonable.
- Time window: `TIME_WINDOW_MINUTES` in `src/lib/grouping.js`. Spec says 30–60; current default 45.
- No auth: anyone can approve, decline, remove, or message anyone. Don't deploy publicly without first adding identity.

## Environment

The app needs **no environment variables**. All map and geocoding services are key-less public endpoints. Don't commit a `.env` file; if you later add backend or paid APIs, prefix env vars with `VITE_` so Vite exposes them to the client and put your real values in `.env.local` (gitignored).
