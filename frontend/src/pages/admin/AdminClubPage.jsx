import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { useCooldown } from '../../hooks/useCooldown';
import IdeasChat from '../../components/IdeasChat';
import ClubLogo from '../../components/ClubLogo';

function AdminClubPage() {
  const { clubId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const cooldown = useCooldown(); // shared by the ideas button and the chat
  const [club, setClub] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [ideas, setIdeas] = useState(null);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideasError, setIdeasError] = useState('');
  const [chatOpen, setChatOpen] = useState(false);

  async function loadEvents() {
    const data = await api.listEvents(`?club=${clubId}`);
    setEvents(data.events);
  }

  useEffect(() => {
    api.getClub(clubId).then((data) => setClub(data.club)).catch((err) => setError(err.message));
    loadEvents().catch((err) => setError(err.message));
  }, [clubId]);

  async function handleDelete(eventId) {
    if (!window.confirm('Remove this event?')) return;
    try {
      await api.deleteEvent(eventId);
      loadEvents();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemoveClub() {
    if (!window.confirm(`Remove "${club.name}" and all its events?`)) return;
    try {
      await api.deleteClub(clubId);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleIdeas() {
    if (ideasLoading || cooldown.active) return;
    setIdeasLoading(true);
    setIdeasError('');
    try {
      const data = await api.getEventIdeas(clubId);
      setIdeas(data.ideas);
    } catch (err) {
      if (err.status === 429) cooldown.start(60);
      else if (err.status === 504) setIdeasError('The AI took too long to answer. Try again.');
      else if (err.status === 502) setIdeasError('AI suggestions are unavailable. Try again shortly.');
      else setIdeasError(err.message);
    } finally {
      setIdeasLoading(false);
    }
  }

  if (!club) return <div className="container"><p>Loading...</p></div>;

  return (
    <div className="container">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '8px 0' }}>
        <ClubLogo club={club} size={72} />
        <h1 style={{ margin: 0 }}>{club.name}</h1>
      </div>
      <div className="filters">
        <Link to={`/admin/clubs/${clubId}/events/new`} className="btn btn-primary">New Event</Link>
        <button onClick={handleIdeas} className="btn btn-ghost" disabled={ideasLoading || cooldown.active}>
          {ideasLoading ? 'Thinking...' : cooldown.active ? `Try again in ${cooldown.secondsLeft}s` : 'Event Ideas'}
        </button>
        <button onClick={() => setChatOpen(true)} className="btn btn-ghost">Chat with AI</button>
        <Link to={`/admin/clubs/${clubId}/edit`} className="btn btn-ghost">Edit Club</Link>
        <Link to={`/admin/clubs/${clubId}/org-chart`} className="btn btn-ghost">Org Chart</Link>
        <Link to={`/admin/clubs/${clubId}/announcements`} className="btn btn-ghost">Announcements</Link>
        {user.role === 'website_admin' && <button onClick={handleRemoveClub} className="btn btn-ghost">Remove Club</button>}
      </div>
      <p className="ai-disclaimer">AI suggestions may be inaccurate; review them before use. Do not include personal details.</p>
      {error && <p className="error">{error}</p>}
      {chatOpen && <IdeasChat clubId={clubId} cooldown={cooldown} onClose={() => setChatOpen(false)} />}
      {cooldown.active && !chatOpen && (
        <p className="error" role="status">AI is busy. Try again in {cooldown.secondsLeft}s.</p>
      )}
      {ideasError && <p className="error">{ideasError}</p>}
      {ideas && (
        <div className="list">
          <h3>Suggested event ideas</h3>
          {ideas.map((idea, i) => (
            <div className="list-item" key={i}>
              <strong>{idea.title}</strong>
              <span>{idea.category}{idea.expectedTurnout != null && ` - expected turnout ${idea.expectedTurnout}`}</span>
              <span>{idea.why}</span>
              <div className="filters" style={{ marginTop: '0.5rem' }}>
                <Link to={`/admin/clubs/${clubId}/events/new`} state={{ idea }} className="btn btn-ghost">Use this idea</Link>
              </div>
            </div>
          ))}
          {ideas.length === 0 && <p>No ideas returned.</p>}
          <p>Ideas are AI suggestions based on this club's past events.</p>
        </div>
      )}
      <div className="list">
        {events.map((event) => (
          <div className="list-item" key={event._id}>
            <strong>{event.title}</strong>
            <span>{new Date(event.date).toLocaleDateString()} - {event.venue}</span>
            <div className="filters" style={{ marginTop: '0.5rem' }}>
              <Link to={`/admin/clubs/${clubId}/events/${event._id}/edit`} className="btn btn-ghost">Edit</Link>
              <Link to={`/admin/clubs/${clubId}/events/${event._id}/registrants`} className="btn btn-ghost">Registrants</Link>
              <Link to={`/admin/clubs/${clubId}/events/${event._id}/attendance`} className="btn btn-ghost">Attendance</Link>
              <button onClick={() => handleDelete(event._id)} className="btn btn-ghost">Remove</button>
            </div>
          </div>
        ))}
        {events.length === 0 && <p>No events yet.</p>}
      </div>
    </div>
  );
}

export default AdminClubPage;