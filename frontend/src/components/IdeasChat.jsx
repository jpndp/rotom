import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

function IdeasChat({ clubId, cooldown, onClose }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);
  const locked = busy || cooldown.active;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  async function send(e) {
    e.preventDefault();
    const content = text.trim();
    if (!content || locked) return;
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setText('');
    setBusy(true);
    setError('');
    try {
      // The server accepts at most 500 characters per message, but AI replies can be longer.
      const payload = next.slice(-9).map(({ role, content: c }) => ({ role, content: c.slice(0, 500) }));
      const data = await api.chatEventIdeas(clubId, payload);
      setMessages([...next, { role: 'assistant', content: data.reply, ideas: data.ideas }]);
    } catch (err) {
      setMessages(messages);
      setText(content);
      if (err.status === 429) cooldown.start(60);
      else if (err.status === 504) setError('The AI took too long to answer. Try again.');
      else if (err.status === 502) setError('AI suggestions are unavailable. Try again shortly.');
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="ideas-chat" aria-label="Chat with AI about event ideas">
      <div className="ideas-chat-head">
        <div>
          <strong>Chat with AI</strong>
          <p className="ai-disclaimer">AI suggestions may be inaccurate; review them before use. Do not include personal details.</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
      </div>
      <div className="ideas-chat-body">
        {messages.length === 0 && <p>Ask for ideas or changes, for example "cheaper events for beginners" or "something outdoors".</p>}
        {messages.map((m, i) => (
          <div key={i} className={`ideas-chat-turn ${m.role}`}>
            <div className="ideas-chat-msg">{m.content}</div>
            {m.ideas?.map((idea, j) => (
              <div className="ideas-chat-idea" key={j}>
                <strong>{idea.title}</strong>
                <span>{idea.category}{idea.expectedTurnout != null && ` - expected turnout ${idea.expectedTurnout}`}</span>
                <span>{idea.why}</span>
                <Link to={`/admin/clubs/${clubId}/events/new`} state={{ idea }} className="btn btn-ghost">Use this idea</Link>
              </div>
            ))}
          </div>
        ))}
        {busy && <p>Thinking...</p>}
        {cooldown.active && <p className="error" role="status">AI is busy. Try again in {cooldown.secondsLeft}s.</p>}
        {error && <p className="error">{error}</p>}
        <div ref={endRef} />
      </div>
      <form className="ideas-chat-form" onSubmit={send}>
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Ask for changes..." disabled={busy} />
        <button type="submit" className="btn btn-primary" disabled={locked || !text.trim()}>
          {cooldown.active ? `${cooldown.secondsLeft}s` : 'Send'}
        </button>
      </form>
      <p className="ideas-chat-note">Suggestions use this club's past event stats. Messages go to a third-party AI service, so do not enter personal details. Conversations are not saved.</p>
    </aside>
  );
}

export default IdeasChat;