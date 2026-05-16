import { useEffect, useRef, useState } from 'react';
import { formatTime } from '../lib/format.js';

// A small mock chat. Messages persist in localStorage but never reach a server.
// `target.prefill` is used for the "Invite to group" shortcut from People tab.
export default function MessageModal({
  fromName,
  target,
  thread,
  onSend,
  onClose,
}) {
  const [text, setText] = useState(target?.prefill || '');
  const inputRef = useRef(null);
  const threadRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [thread.length]);

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdrop}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal__header">
          <div>
            <div className="modal__title">
              {target.type === 'group' ? 'Message group' : 'Message'}
            </div>
            <div className="modal__subtitle">{target.displayName}</div>
          </div>
          <button
            type="button"
            className="modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="modal__thread" ref={threadRef}>
          {thread.length === 0 ? (
            <p className="dim modal__empty">
              No messages yet. This is a mock chat — your messages save locally
              on this device.
            </p>
          ) : (
            thread.map((m) => (
              <div
                key={m.id}
                className={`bubble ${m.from === fromName ? 'mine' : 'theirs'}`}
              >
                <div className="bubble__from">{m.from}</div>
                <div className="bubble__text">{m.text}</div>
                <div className="bubble__time">
                  {formatTime(new Date(m.createdAt))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="modal__compose">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type a message…  (Enter to send, Shift+Enter for newline)"
            rows={2}
          />
          <button type="button" className="primary" onClick={handleSend}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
