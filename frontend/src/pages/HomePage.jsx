import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import ClubLogo from '../components/ClubLogo';

function HomePage() {
  const [clubs, setClubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.listClubs(),
      api.listEvents('?when=upcoming'),
      api.listAnnouncements(),
    ])
      .then(([clubData, eventData, announcementData]) => {
        setClubs(clubData.clubs.slice(0, 4));
        setEvents(eventData.events.slice(0, 4));
        setAnnouncements(announcementData.announcements.slice(0, 4));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container"><p>Loading...</p></div>;

  return (
    <div className="container">
      <h1>Welcome to Rotom</h1>

      <div className="dashboard-section-header">
        <h2>Clubs</h2>
        <Link to="/clubs">See all</Link>
      </div>
      <div className="grid">
        {clubs.map((club) => (
          <Link to={`/clubs/${club._id}`} key={club._id} className="card">
            <span className="badge">{club.category}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0' }}>
              <ClubLogo key={club.logoUrl} club={club} size={56} />
              <h3 style={{ margin: 0 }}>{club.name}</h3>
            </div>
            <p>{club.description}</p>
          </Link>
        ))}
        {clubs.length === 0 && <p>No clubs yet.</p>}
      </div>

      <div className="dashboard-section-header">
        <h2>Upcoming Events</h2>
        <Link to="/events">See all</Link>
      </div>
      <div className="list">
        {events.map((event) => (
          <Link to={`/events/${event._id}`} key={event._id} className="list-item">
            <strong>{event.title}</strong>
            <span>{event.club?.name} · {new Date(event.date).toLocaleDateString()}</span>
          </Link>
        ))}
        {events.length === 0 && <p>No upcoming events.</p>}
      </div>

      <div className="dashboard-section-header">
        <h2>Announcements</h2>
        <Link to="/announcements">See all</Link>
      </div>
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

export default HomePage;