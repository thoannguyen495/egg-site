import { useMemo, useState } from 'react';
import { findMatchingGroups, findMatchingPeople } from '../lib/grouping.js';
import { formatDate, formatTime } from '../lib/format.js';
import MapView from './MapView.jsx';

export default function ResultsView({
  draft,
  rides,
  groups,
  onRequestToJoin,
  onMessageGroup,
  onMessagePerson,
  onInvitePerson,
  onPostSolo,
  onCancel,
}) {
  const [tab, setTab] = useState('groups');

  const matchingGroups = useMemo(
    () => findMatchingGroups(draft, groups),
    [draft, groups]
  );

  const matchingPeople = useMemo(
    () => findMatchingPeople(draft, rides),
    [draft, rides]
  );

  return (
    <div className="results-view">
      <button type="button" className="back" onClick={onCancel}>
        ← Back to form
      </button>

      <div className="results-summary card">
        <h2>Looking for matches</h2>
        <p className="meta">
          <strong>{draft.name}</strong> · {draft.pickupArea} → {draft.destination}
          <br />
          <span className="dim">
            🗓 {formatDate(draft.date)} · ⏰ {formatTime(draft.time)}
          </span>
        </p>
      </div>

      <MapView
        pickup={draft.pickupPlace}
        destination={draft.destinationPlace}
      />

      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'groups'}
          className={tab === 'groups' ? 'tab active' : 'tab'}
          onClick={() => setTab('groups')}
        >
          Groups ({matchingGroups.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'people'}
          className={tab === 'people' ? 'tab active' : 'tab'}
          onClick={() => setTab('people')}
        >
          People ({matchingPeople.length})
        </button>
      </div>

      {tab === 'groups' && (
        <div className="tab-content" role="tabpanel">
          {matchingGroups.length === 0 ? (
            <p className="empty-state">
              No matching groups yet. Post your ride below and others heading
              the same way can request to join.
            </p>
          ) : (
            matchingGroups.map((g) => (
              <article key={g.id} className="result-card">
                <div className="result-card__title">
                  <span>{g.pickupLabel}</span>
                  <span className="arrow">→</span>
                  <span>{g.destinationLabel}</span>
                </div>
                <div className="result-card__meta">
                  <span>
                    👥 {g.members.length}{' '}
                    {g.members.length === 1 ? 'person' : 'people'}
                  </span>
                  <span>🗓 {formatDate(g.date)}</span>
                  <span>⏰ around {formatTime(g.avgTime)}</span>
                  {g.pending.length > 0 && (
                    <span className="pending-badge">
                      {g.pending.length} pending
                    </span>
                  )}
                </div>
                <div className="result-card__actions">
                  <button
                    type="button"
                    className="primary"
                    onClick={() => onRequestToJoin(g)}
                  >
                    Request to join
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => onMessageGroup(g)}
                  >
                    Message group
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {tab === 'people' && (
        <div className="tab-content" role="tabpanel">
          {matchingPeople.length === 0 ? (
            <p className="empty-state">
              No one else is heading toward &ldquo;{draft.destination}&rdquo; yet.
              Post your ride to be the first.
            </p>
          ) : (
            matchingPeople.map((p) => (
              <article key={p.id} className="result-card">
                <div className="result-card__title">{p.name}</div>
                <div className="result-card__meta">
                  <span>
                    📍 {p.pickupArea} → {p.destination}
                  </span>
                </div>
                <div className="result-card__meta dim">
                  <span>🗓 {formatDate(p.date)}</span>
                  <span>⏰ {formatTime(p.time)}</span>
                  {p.status === 'pending' && (
                    <span className="pending-badge">pending</span>
                  )}
                </div>
                {p.notes && (
                  <p className="result-card__note">&ldquo;{p.notes}&rdquo;</p>
                )}
                <div className="result-card__actions">
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => onMessagePerson(p)}
                  >
                    Message
                  </button>
                  <button
                    type="button"
                    className="primary"
                    onClick={() => onInvitePerson(p)}
                  >
                    Invite to group
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      <div className="results-footer card">
        <p>None of these look right?</p>
        <button type="button" className="primary" onClick={onPostSolo}>
          Post my ride as a new group
        </button>
      </div>
    </div>
  );
}
