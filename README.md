# 🥚 Egg Rides

A tiny ride-sharing **coordination** app. Tell the app where you're starting, where you're going, and when you want to leave — it shows you matching groups and people, then you choose to request to join or start your own group.

No accounts, no backend, **no API keys** — everything runs in your browser. Maps come from OpenStreetMap, autocomplete from Nominatim, and the route line from OSRM.

## Quick start

You need [Node.js](https://nodejs.org) 18 or newer.

```sh
npm install
npm run dev
```

Then open the URL Vite prints (usually <http://localhost:5173>).

That's it. There is no `.env` file to configure.

## How it works

1. **Fill out the ride form** (name, pickup, destination, date, time, optional notes) and click **Find my group**.
2. You land on a **Results page** with two tabs:
   - **Groups** — existing ride groups whose destination, pickup, and time all match yours.
   - **People** — individuals heading to a similar destination.
3. From there you can:
   - **Request to join** a group → your ride is added as a pending request.
   - **Message group** or **Message** a person → opens a small mock chat. Messages save locally.
   - **Invite to group** on a person → opens the chat with a friendly prefilled invite.
   - **Post my ride as a new group** → commits your ride as a new group of one.
   - **Back to form** → discards the draft but keeps your form input.
4. **Click any group on the home page** to see members, see pending join requests, and Approve / Decline / Remove people.

## Location features

- **Pickup / Destination autocomplete** — typed text is debounced 350 ms and sent to OpenStreetMap's Nominatim search; up to 5 suggestions drop down. Picking one stores `{ placeId, name, address, lat, lng }` on the ride.
- **📍 Use my current location** — browser Geolocation API → Nominatim reverse-geocode → readable address auto-fills the Pickup field.
- **Map preview** — a Leaflet map under the form with OpenStreetMap tiles, a green pickup pin, a yellow destination pin, and a green route line drawn between them (driving route via OSRM when reachable, straight line as fallback).

### Free services used

| Service | Purpose | Provider |
|---|---|---|
| OpenStreetMap tiles | Map background imagery | tile.openstreetmap.org |
| Nominatim | Autocomplete + reverse geocoding | nominatim.openstreetmap.org |
| OSRM | Driving route polyline | router.project-osrm.org |

All three are run by the OSM community as best-effort public services. They're great for personal projects and demos but have **strict usage limits** (Nominatim: ≤1 request/sec; OSRM demo: no SLA). For production, self-host or use a paid alternative.

## What's stored on each ride

```js
{
  id, name,
  pickupArea, pickupPlace,        // pickupPlace = { placeId, name, address, lat, lng } | null
  destination, destinationPlace,
  date, time, notes,
  createdAt, groupId,
  status: 'confirmed' | 'pending'
}
```

`pickupArea` is the editable text shown in the input; `pickupPlace` is the structured place captured when the user picks a suggestion or uses "Use my current location." Typing manually clears `pickupPlace` so stale coords don't follow inconsistent text.

## Matching rules

Two rides match if **all three** of these hold (text-based for now):

- **Destination** strings are similar (case-insensitive equality, substring containment, or any shared 3+ letter token — so "PDX" matches "PDX Airport").
- **Pickup area** strings are similar by the same rule.
- **Departure times** are within ~45 minutes on the same date.

Coordinates are stored but **not yet used for matching** — a future change can swap `placeSimilar` in `src/lib/grouping.js` for a real distance check using the stored `lat` / `lng`.

## Build for production

```sh
npm run build
npm run preview
```

The static site lands in `dist/`.

## Roadmap / known limitations

- **One browser, one device.** No syncing. Add a backend (Firebase / Supabase / your own) for cross-device sharing.
- **Text-only matching.** Coords are captured but not used; distance-based matching is a one-function swap away.
- **No auth.** Anyone with the app open can approve, decline, remove, or message anyone.
- **Mock messaging.** Messages persist locally but never travel anywhere.
- **Public OSM services have rate limits.** Nominatim caps at ~1 req/sec (we debounce 350 ms). OSRM's demo server has no SLA. Fine for personal use; for production, self-host or use a paid mapping provider (Mapbox, Maptiler, Stadia, Geoapify…).
