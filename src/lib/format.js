export function formatDate(d) {
  if (!d) return '';
  const date = new Date(`${d}T00:00:00`);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(value) {
  if (!value) return '';
  let date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'string' && /^\d{2}:\d{2}/.test(value)) {
    date = new Date(`2000-01-01T${value}:00`);
  } else {
    date = new Date(value);
  }
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}
