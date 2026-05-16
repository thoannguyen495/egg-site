// Pure logic. No React, no DOM, no I/O.
// `placeSimilar` is the spot to swap for a real Maps/Places distance check.

export const TIME_WINDOW_MINUTES = 45;

export function normalize(s) {
  return (s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Two place strings are "similar" if any of:
//   - normalized equality
//   - substring containment either direction
//   - they share at least one token of length >= 3
export function placeSimilar(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const aTokens = new Set(na.split(' '));
  for (const t of nb.split(' ')) {
    if (t.length >= 3 && aTokens.has(t)) return true;
  }
  return false;
}

function toTimestamp(date, time) {
  return new Date(`${date}T${time}:00`).getTime();
}

export function timeClose(a, b, windowMinutes = TIME_WINDOW_MINUTES) {
  const ta = toTimestamp(a.date, a.time);
  const tb = toTimestamp(b.date, b.time);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return false;
  return Math.abs(ta - tb) <= windowMinutes * 60 * 1000;
}

export function ridesMatch(a, b) {
  return (
    placeSimilar(a.destination, b.destination) &&
    placeSimilar(a.pickupArea, b.pickupArea) &&
    timeClose(a, b)
  );
}

// Group rides by their explicit groupId.
// (Previously this used union-find to auto-cluster matching rides; now grouping
// is explicit — each ride carries the groupId of the group it joined.)
export function getGroups(rides) {
  const buckets = {};
  for (const r of rides) {
    if (!r.groupId) continue;
    if (!buckets[r.groupId]) buckets[r.groupId] = [];
    buckets[r.groupId].push(r);
  }
  return Object.entries(buckets).map(([id, members]) => {
    members.sort((a, b) => a.createdAt - b.createdAt);
    const confirmed = members.filter((m) => m.status === 'confirmed');
    const pending = members.filter((m) => m.status === 'pending');
    // Anchor = first confirmed member, fallback to first member overall.
    const anchor = confirmed[0] || members[0];

    const timeSource = confirmed.length > 0 ? confirmed : members;
    const avgMs =
      timeSource.reduce((sum, m) => sum + toTimestamp(m.date, m.time), 0) /
      timeSource.length;

    return {
      id,
      destinationLabel: anchor.destination,
      pickupLabel: anchor.pickupArea,
      date: anchor.date,
      avgTime: new Date(avgMs),
      members: confirmed,
      pending,
      allMembers: members,
      createdAt: anchor.createdAt,
    };
  });
}

// Groups whose anchor (or any member) matches the draft via ridesMatch.
export function findMatchingGroups(draft, groups) {
  return groups.filter((g) =>
    g.allMembers.some((m) => ridesMatch(draft, m))
  );
}

// People (rides) whose destination is similar to the draft's destination.
// Looser than ridesMatch — pickup/time are ignored here on purpose.
export function findMatchingPeople(draft, rides) {
  return rides.filter((r) => placeSimilar(draft.destination, r.destination));
}
