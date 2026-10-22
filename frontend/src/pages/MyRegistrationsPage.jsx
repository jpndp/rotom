import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContextValue';
import { api } from '../api/client';

function MyRegistrationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    api.myRegistrations()
      .then((data) => setRegistrations(data.registrations))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const now = new Date();
  const upcoming = registrations.filter((r) => r.event && new Date(r.event.date) >= now);
  const past = registrations.filter((r) => r.event && new Date(r.event.date) < now);

  return (
    <div className="container">
      <h1>My Events</h1>
      {error && <p className="error">{error}</p>}
      {loading ? <p>Loading...</p> : (
        <>
          <h2>Upcoming</h2>
          <div className="list">
            {upcoming.map((r) => (
              <Link to={`/events/${r.event._id}`} key={r._id} className="list-item">
                <strong>{r.event.title}</strong>
                <span>{r.event.club?.name} · {new Date(r.event.date).toLocaleDateString()}</span>
              </Link>
            ))}
            {upcoming.length === 0 && <p>No upcoming registrations.</p>}
          </div>

          <h2>Past</h2>
          <div className="list">
            {past.map((r) => (
              <Link to={`/events/${r.event._id}`} key={r._id} className="list-item">
                <strong>{r.event.title}</strong>
                <span>{r.event.club?.name} · {new Date(r.event.date).toLocaleDateString()}</span>
              </Link>
            ))}
            {past.length === 0 && <p>No past events.</p>}
          </div>
        </>
      )}
    </div>
  );
}

export default MyRegistrationsPage;
