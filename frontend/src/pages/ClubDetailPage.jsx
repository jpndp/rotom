import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import ClubLogo from '../components/ClubLogo';

function ClubDetailPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [club, setClub] = useState(null);
  const [events, setEvents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getClub(id).then((data) => setClub(data.club)).catch((err) => setError(err.message));
    api.listEvents(`?club=${id}`).then((data) => setEvents(data.events)).catch(() => {});
    api.listAnnouncements(id).then((data) => setAnnouncements(data.announcements)).catch(() => {});
  }, [id]);

  if (error) return <div className="container"><p className="error">{error}</p></div>;
  if (!club) return <div className="container"><p>Loading...</p></div>;

  return (
    <div className="container">
      <span className="badge">{club.category}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '8px 0' }}>
        <ClubLogo key={club.logoUrl} club={club} size={96} />
        <h1 style={{ margin: 0 }}>{club.name}</h1>
      </div>
      <p>{club.description}</p>
      {!authLoading && (
        <p>
          {user
            ? <Link to={`/clubs/${id}/org-chart`}>View org chart</Link>
            : <><Link to="/login" state={{ from: `/clubs/${id}` }}>Log in</Link> to view the org chart.</>}
        </p>
      )}

      <h2>Events</h2>
      <div className="list">
        {events.map((event) => (
          <Link to={`/events/${event._id}`} key={event._id} className="list-item">
            <strong>{event.title}</strong>
            <span>{new Date(event.date).toLocaleDateString()} · {event.startTime}</span>
          </Link>
        ))}
        {events.length === 0 && <p>No events yet.</p>}
      </div>

      <h2>Announcements</h2>
      <div className="list">
        {announcements.map((a) => (
          <div className="list-item" key={a._id}>
            <strong>{a.title}</strong>
            <span>{a.content}</span>
          </div>
        ))}
        {announcements.length === 0 && <p>No announcements yet.</p>}
      </div>
    </div>
  );
}

export default ClubDetailPage;