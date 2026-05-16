import { formatDate, formatTime } from '../lib/format.js';

export default function GroupDetail({ group, onBack, onApprove, onDecline, onLeave }) {
  return (
    <div className="group-detail card">
      <button type="button" className="back" onClick={onBack}>
        ← Back to all groups
      </button>

      <h2>
        {group.pickupLabel} → {group.destinationLabel}
      </h2>
      <p className="meta">
        🗓 {formatDate(group.date)} · ⏰ leaving around {formatTime(group.avgTime)}
      </p>

      <section>
        <h3>In the group ({group.members.length})</h3>
        {group.members.length === 0 ? (
          <p className="hint">
            No confirmed members yet — approve a pending request below to start the group.
          </p>
        ) : (
          <ul className="member-list">
            {group.members.map((m) => (
              <li key={m.id}>
                <div className="member-info">
                  <strong>{m.name}</strong>
                  <div className="sub">
                    leaving {formatTime(m.time)} from {m.pickupArea}
                  </div>
                  {m.notes && <div className="notes">"{m.notes}"</div>}
                </div>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => onLeave(m.id)}
                  title="Remove this person from the group"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {group.pending.length > 0 && (
        <section>
          <h3>Pending join requests ({group.pending.length})</h3>
          <ul className="member-list">
            {group.pending.map((m) => (
              <li key={m.id}>
                <div className="member-info">
                  <strong>{m.name}</strong>
                  <div className="sub">
                    leaving {formatTime(m.time)} from {m.pickupArea}
                  </div>
                  {m.notes && <div className="notes">"{m.notes}"</div>}
                </div>
                <div className="actions">
                  <button
                    type="button"
                    className="primary"
                    onClick={() => onApprove(m.id)}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => onDecline(m.id)}
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
