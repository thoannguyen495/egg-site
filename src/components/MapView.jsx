import { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';

const DEFAULT_CENTER = [45.5152, -122.6784]; // Portland, OR
const DEFAULT_ZOOM = 12;

function hasCoord(p) {
  return p && typeof p.lat === 'number' && typeof p.lng === 'number';
}

// Custom pins via divIcon — colored circles, no image assets to bundle.
function makePin(background, borderColor) {
  return L.divIcon({
    className: 'leaflet-egg-pin',
    html: `<span style="
      display:block;
      background:${background};
      border:2px solid ${borderColor};
      width:20px;height:20px;border-radius:50%;
      box-shadow:0 1px 4px rgba(0,0,0,0.35);
    "></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}
const PICKUP_ICON = makePin('#2a6f50', '#1f5a40');
const DESTINATION_ICON = makePin('#f5b400', '#c98c00');

export default function MapView({ pickup, destination, height = 240 }) {
  const pickupCoord = hasCoord(pickup) ? [pickup.lat, pickup.lng] : null;
  const destinationCoord = hasCoord(destination)
    ? [destination.lat, destination.lng]
    : null;

  if (!pickupCoord && !destinationCoord) {
    return (
      <div className="map-placeholder card">
        <div className="map-placeholder__icon" aria-hidden="true">🗺</div>
        <div>
          <strong>Map preview</strong>
          <p className="dim">
            Pick a pickup and destination from the suggestions to see them here.
          </p>
        </div>
      </div>
    );
  }

  const center = pickupCoord || destinationCoord || DEFAULT_CENTER;

  return (
    <div className="map-card card">
      <MapContainer
        center={center}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={false}
        style={{ width: '100%', height: `${height}px`, borderRadius: '14px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        {pickupCoord && (
          <Marker position={pickupCoord} icon={PICKUP_ICON} title="Pickup" />
        )}
        {destinationCoord && (
          <Marker
            position={destinationCoord}
            icon={DESTINATION_ICON}
            title="Destination"
          />
        )}
        {pickupCoord && destinationCoord && (
          <RouteLine pickup={pickup} destination={destination} />
        )}
        <FitToMarkers pickup={pickupCoord} destination={destinationCoord} />
      </MapContainer>
    </div>
  );
}

function FitToMarkers({ pickup, destination }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    if (pickup && destination) {
      const bounds = L.latLngBounds(pickup, destination);
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (pickup || destination) {
      map.setView(pickup || destination, 14);
    }
  }, [
    map,
    pickup?.[0],
    pickup?.[1],
    destination?.[0],
    destination?.[1],
  ]);
  return null;
}

// Draws a route between pickup and destination.
// Tries OSRM (free public demo server) for a real driving polyline;
// silently falls back to a straight line if OSRM is unreachable / refuses.
// OSRM demo at https://router.project-osrm.org/ has unpublished rate limits;
// fine for personal dev. For production, self-host or use a paid alternative.
function RouteLine({ pickup, destination }) {
  const [positions, setPositions] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const straight = [
      [pickup.lat, pickup.lng],
      [destination.lat, destination.lng],
    ];

    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${pickup.lng},${pickup.lat};${destination.lng},${destination.lat}` +
      `?overview=full&geometries=geojson`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const coords = data?.routes?.[0]?.geometry?.coordinates;
        if (Array.isArray(coords) && coords.length > 1) {
          // GeoJSON gives [lng, lat]; Leaflet wants [lat, lng].
          setPositions(coords.map(([lng, lat]) => [lat, lng]));
        } else {
          setPositions(straight);
        }
      })
      .catch(() => {
        if (!cancelled) setPositions(straight);
      });

    return () => {
      cancelled = true;
    };
  }, [pickup.lat, pickup.lng, destination.lat, destination.lng]);

  if (!positions) return null;
  return (
    <Polyline
      positions={positions}
      pathOptions={{ color: '#2a6f50', weight: 4, opacity: 0.85 }}
    />
  );
}
