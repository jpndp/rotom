import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';

function ModerationPage() {
  const [clubs, setClubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [club, setClub] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.listClubs().then((data) => setClubs(data.clubs)).catch((err) => setError(err.message));
  }, []);

    useEffect(() => {
    let stale = false;
    api.listEvents(club ? `?club=${club}` : '')
      .then((data) => { if (!stale) setEvents(data.events); })
      .catch((err) => { if (!stale) setError(err.message); });
    return () => { stale = true; };
  }, [club]);

  async function handleRemove(event) {
    if (!window.confirm(`Remove "${event.title}"?`)) return;
    try {
      await api.deleteEvent(event._id);
      setEvents((prev) => prev.filter((e) => e._id !== event._id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="container">
      <h1>Moderate Events</h1>
      <div className="filters">
        <select value={club} onChange={(e) => setClub(e.target.value)}>
          <option value="">All clubs</option>
          {clubs.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="list">
        {events.map((event) => (
          <div className="list-item" key={event._id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link to={`/events/${event._id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
              <strong>{event.title}</strong>
              <span style={{ display: 'block' }}>{event.club?.name} - {new Date(event.date).toLocaleDateString()} - {event.venue}</span>
            </Link>
            <button onClick={() => handleRemove(event)} className="btn btn-ghost">Remove</button>
          </div>
        ))}
        {events.length === 0 && <p>No events found.</p>}
      </div>
    </div>
  );
}

export default ModerationPage;