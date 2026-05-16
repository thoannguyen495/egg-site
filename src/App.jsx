import { useCallback, useEffect, useMemo, useState } from 'react';
import RideForm from './components/RideForm.jsx';
import GroupList from './components/GroupList.jsx';
import GroupDetail from './components/GroupDetail.jsx';
import ResultsView from './components/ResultsView.jsx';
import MessageModal from './components/MessageModal.jsx';
import {
  loadRides,
  saveRides,
  loadMessages,
  saveMessages,
} from './lib/storage.js';
import { getGroups } from './lib/grouping.js';
import './App.css';

function genId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function defaultDate() {
  return new Date().toISOString().slice(0, 10);
}
function defaultTime() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d.toTimeString().slice(0, 5);
}
function freshFormValues() {
  return {
    name: '',
    pickupArea: '',
    pickupPlace: null,        // { placeId, name, address, lat, lng } | null
    destination: '',
    destinationPlace: null,   // same shape
    date: defaultDate(),
    time: defaultTime(),
    notes: '',
  };
}

export default function App() {
  // Persisted data
  const [rides, setRides] = useState(() => loadRides());
  const [messages, setMessages] = useState(() => loadMessages());

  // UI state
  // view: 'home' | 'results' | 'detail'
  const [view, setView] = useState('home');
  // formValues is lifted so "Back to form" survives without losing input.
  const [formValues, setFormValues] = useState(() => freshFormValues());
  // draft = the ride being shopped around in Results view (not yet committed)
  const [draft, setDraft] = useState(null);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [flash, setFlash] = useState(null);
  const [messageTarget, setMessageTarget] = useState(null);

  // Persistence side-effects
  useEffect(() => {
    saveRides(rides);
  }, [rides]);
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  const groups = useMemo(() => getGroups(rides), [rides]);

  const activeGroup = useMemo(() => {
    if (!activeGroupId) return null;
    return groups.find((g) => g.id === activeGroupId) || null;
  }, [groups, activeGroupId]);

  useEffect(() => {
    if (view === 'detail' && activeGroupId && !activeGroup) {
      setActiveGroupId(null);
      setView('home');
    }
  }, [view, activeGroupId, activeGroup]);

  const showFlash = useCallback((msg) => {
    setFlash(msg);
    window.clearTimeout(showFlash._t);
    showFlash._t = window.setTimeout(() => setFlash(null), 5000);
  }, []);

  // ---------- form & flow ----------

  function handleFindMyGroup() {
    setDraft({ ...formValues });
    setView('results');
  }

  function commitDraftToGroup(groupId, status) {
    if (!draft) return;
    const ride = {
      id: genId(),
      name: draft.name,
      pickupArea: draft.pickupArea,
      pickupPlace: draft.pickupPlace || null,
      destination: draft.destination,
      destinationPlace: draft.destinationPlace || null,
      date: draft.date,
      time: draft.time,
      notes: draft.notes,
      createdAt: Date.now(),
      groupId,
      status,
    };
    setRides((prev) => [...prev, ride]);
  }

  function handleRequestToJoin(group) {
    commitDraftToGroup(group.id, 'pending');
    setDraft(null);
    setFormValues(freshFormValues());
    setView('home');
    showFlash(
      `Join request sent. When someone in the ${group.pickupLabel} → ${group.destinationLabel} group approves, you're in.`
    );
  }

  function handlePostSolo() {
    const newGroupId = genId();
    commitDraftToGroup(newGroupId, 'confirmed');
    setDraft(null);
    setFormValues(freshFormValues());
    setView('home');
    showFlash(
      `Posted! You're the first in your group — others can request to join.`
    );
  }

  function handleCancelDraft() {
    setDraft(null);
    setView('home');
  }

  // ---------- group detail ----------

  function handleOpenGroup(group) {
    setActiveGroupId(group.id);
    setView('detail');
  }

  function handleBackFromDetail() {
    setActiveGroupId(null);
    setView('home');
  }

  function handleApprove(rideId) {
    setRides((prev) =>
      prev.map((r) => (r.id === rideId ? { ...r, status: 'confirmed' } : r))
    );
  }

  function handleDecline(rideId) {
    setRides((prev) => prev.filter((r) => r.id !== rideId));
  }

  function handleLeave(rideId) {
    setRides((prev) => prev.filter((r) => r.id !== rideId));
  }

  // ---------- messages ----------

  function openPersonMessage(person, prefill = '') {
    setMessageTarget({
      type: 'person',
      name: person.name,
      displayName: person.name,
      prefill,
    });
  }

  function openGroupMessage(group) {
    setMessageTarget({
      type: 'group',
      groupId: group.id,
      displayName: `${group.pickupLabel} → ${group.destinationLabel}`,
    });
  }

  function closeMessageModal() {
    setMessageTarget(null);
  }

  function handleSendMessage(text) {
    if (!messageTarget || !draft) return;
    const msg = {
      id: genId(),
      from: draft.name || 'Guest',
      toName: messageTarget.type === 'person' ? messageTarget.name : null,
      toGroupId: messageTarget.type === 'group' ? messageTarget.groupId : null,
      text,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, msg]);
  }

  const thread = useMemo(() => {
    if (!messageTarget || !draft) return [];
    if (messageTarget.type === 'person') {
      return messages.filter(
        (m) =>
          (m.from === draft.name && m.toName === messageTarget.name) ||
          (m.from === messageTarget.name && m.toName === draft.name)
      );
    }
    return messages.filter((m) => m.toGroupId === messageTarget.groupId);
  }, [messages, messageTarget, draft]);

  // ---------- render ----------

  return (
    <div className="app">
      <header className="app-header">
        <h1>🥚 Egg Rides</h1>
        <p>Share rides with people heading the same way, around the same time.</p>
      </header>

      {flash && <div className="flash">{flash}</div>}

      {view === 'home' && (
        <>
          <RideForm
            values={formValues}
            onChange={setFormValues}
            onSubmit={handleFindMyGroup}
          />
          <GroupList groups={groups} onOpen={handleOpenGroup} />
        </>
      )}

      {view === 'results' && draft && (
        <ResultsView
          draft={draft}
          rides={rides}
          groups={groups}
          onRequestToJoin={handleRequestToJoin}
          onMessageGroup={openGroupMessage}
          onMessagePerson={openPersonMessage}
          onInvitePerson={(p) =>
            openPersonMessage(
              p,
              `Hey ${p.name}, I'm heading to ${draft.destination} from ${draft.pickupArea} around ${draft.time}. Want to share a ride?`
            )
          }
          onPostSolo={handlePostSolo}
          onCancel={handleCancelDraft}
        />
      )}

      {view === 'detail' && activeGroup && (
        <GroupDetail
          group={activeGroup}
          onBack={handleBackFromDetail}
          onApprove={handleApprove}
          onDecline={handleDecline}
          onLeave={handleLeave}
        />
      )}

      {messageTarget && draft && (
        <MessageModal
          key={`${messageTarget.type}-${
            messageTarget.name ?? messageTarget.groupId
          }`}
          fromName={draft.name}
          target={messageTarget}
          thread={thread}
          onSend={handleSendMessage}
          onClose={closeMessageModal}
        />
      )}

      <footer className="app-footer">
        Data lives in this browser only. Clearing site data will erase all rides
        and messages.
      </footer>
    </div>
  );
}
