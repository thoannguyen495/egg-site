// Thin wrapper around localStorage with version migrations.
//
//   v1: rides auto-clustered, no groupId, status: 'confirmed' | 'pending'
//   v2: explicit groupId, optional pickupCoords / destinationCoords ({lat,lng})
//   v3: pickupPlace / destinationPlace = { placeId, name, address, lat, lng }
//
// loadRides() reads the newest key it finds and migrates older shapes forward.

const RIDES_KEY_V3 = 'egg-rides-v3';
const RIDES_KEY_V2 = 'egg-rides-v2';
const RIDES_KEY_V1 = 'egg-rides-v1';
const MESSAGES_KEY = 'egg-messages-v1';

function coordsToPlace(coords, label) {
  if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
    return null;
  }
  return {
    placeId: '',
    name: '',
    address: label || '',
    lat: coords.lat,
    lng: coords.lng,
  };
}

export function loadRides() {
  try {
    const v3 = localStorage.getItem(RIDES_KEY_V3);
    if (v3) {
      const data = JSON.parse(v3);
      return Array.isArray(data) ? data : [];
    }

    // v2 -> v3: pickupCoords/destinationCoords become richer Place objects.
    const v2 = localStorage.getItem(RIDES_KEY_V2);
    if (v2) {
      const data = JSON.parse(v2);
      if (Array.isArray(data)) {
        return data.map((r) => {
          const { pickupCoords, destinationCoords, ...rest } = r;
          return {
            ...rest,
            pickupPlace:
              r.pickupPlace || coordsToPlace(pickupCoords, r.pickupArea),
            destinationPlace:
              r.destinationPlace ||
              coordsToPlace(destinationCoords, r.destination),
          };
        });
      }
    }

    // v1 -> v3: legacy auto-clustered rides; give each its own group.
    const v1 = localStorage.getItem(RIDES_KEY_V1);
    if (v1) {
      const data = JSON.parse(v1);
      if (Array.isArray(data)) {
        return data.map((r) => ({
          ...r,
          groupId: r.groupId || `legacy-${r.id}`,
          status: r.status || 'confirmed',
          pickupPlace: null,
          destinationPlace: null,
        }));
      }
    }

    return [];
  } catch {
    return [];
  }
}

export function saveRides(rides) {
  try {
    localStorage.setItem(RIDES_KEY_V3, JSON.stringify(rides));
  } catch {
    // Quota or private-mode failure — fail silently for MVP.
  }
}

export function loadMessages() {
  try {
    const raw = localStorage.getItem(MESSAGES_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveMessages(messages) {
  try {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
  } catch {}
}

export function clearAll() {
  localStorage.removeItem(RIDES_KEY_V3);
  localStorage.removeItem(RIDES_KEY_V2);
  localStorage.removeItem(RIDES_KEY_V1);
  localStorage.removeItem(MESSAGES_KEY);
}
