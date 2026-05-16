import { formatDate, formatTime } from '../lib/format.js';

export default function GroupCard({ group, onOpen }) {
  const people = group.members.length;
  const pending = group.pending.length;
  return (
    <button type="button" className="group-card" onClick={() => onOpen(group)}>
      <div className="group-card__title">
        <span className="from">{group.pickupLabel}</span>
        <span className="arrow">→</span>
        <span className="to">{group.destinationLabel}</span>
      </div>
      <div className="group-card__meta">
        <span>👥 {people} {people === 1 ? 'person' : 'people'}</span>
        <span>🗓 {formatDate(group.date)}</span>
        <span>⏰ around {formatTime(group.avgTime)}</span>
        {pending > 0 && (
          <span className="pending-badge">
            {pending} pending
          </span>
        )}
      </div>
    </button>
  );
}
