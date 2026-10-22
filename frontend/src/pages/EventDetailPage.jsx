import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

function EventDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    api.getEvent(id).then((data) => setEvent(data.event)).catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    if (!user) return;
    api.myRegistrations()
      .then((data) => setRegistered(data.registrations.some((r) => r.event?._id === id)))
      .catch(() => {});
  }, [user, id]);

  async function handleRegister() {
    if (!user) {
      navigate('/login', { state: { from: `/events/${id}` } });
      return;
    }
    setBusy(true);
    setStatus('');
    try {
      await api.registerForEvent(id);
      setRegistered(true);
      setStatus('You are registered for this event.');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    setBusy(true);
    setStatus('');
    try {
      await api.cancelRegistration(id);
      setRegistered(false);
      setStatus('Registration cancelled.');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <div className="container"><p className="error">{error}</p></div>;
  if (!event) return <div className="container"><p>Loading...</p></div>;

  const isPast = new Date(event.date).getTime() + 864e5 < Date.now();
  return (
    <div className="container">
      {event.club && <Link to={`/clubs/${event.club._id}`} className="badge">{event.club.name}</Link>}
      <h1>{event.title}</h1>
      <p className="meta">{new Date(event.date).toLocaleDateString()} · {event.startTime}{event.endTime ? `–${event.endTime}` : ''} · {event.venue}</p>
      <p>{event.description}</p>

      {registered ? (
        <button className="btn btn-ghost" onClick={handleCancel} disabled={busy}>
          Cancel registration
        </button>
      ) : (
        <button className="btn btn-primary" onClick={handleRegister} disabled={busy || isPast}>
          {isPast ? 'Registration closed' : user ? 'Register' : 'Login to Register'}
        </button>
)}
      {status && <p className="status">{status}</p>}
    </div>
  );
}

export default EventDetailPage;