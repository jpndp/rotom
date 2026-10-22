import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContextValue';
import { api } from '../api/client';

function EventDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [eventResult, setEventResult] = useState(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [registrationResult, setRegistrationResult] = useState(null);
  const registrationKey = `${id}:${user?._id || user?.id || 'anonymous'}`;
  const currentEventResult = eventResult?.id === id ? eventResult : null;
  const event = currentEventResult?.event || null;
  const error = currentEventResult?.error || '';
  const registered = registrationResult?.key === registrationKey && registrationResult.registered;

  useEffect(() => {
    let current = true;
    let closeTimer;
    const updatePastStatus = (closesAt) => {
      const remaining = closesAt - Date.now();
      if (remaining <= 0) {
        if (current) {
          setEventResult((previous) => previous?.id === id ? { ...previous, isPast: true } : previous);
        }
        return;
      }
      closeTimer = window.setTimeout(() => updatePastStatus(closesAt), Math.min(remaining, 2147483647));
    };
    api.getEvent(id)
      .then((data) => {
        if (!current) return;
        const closesAt = new Date(data.event.date).getTime() + 864e5;
        const isPast = closesAt < Date.now();
        setEventResult({ id, event: data.event, isPast });
        if (!isPast) updatePastStatus(closesAt);
      })
      .catch((err) => {
        if (current) setEventResult({ id, error: err.message });
      });
    return () => {
      current = false;
      window.clearTimeout(closeTimer);
    };
  }, [id]);

  useEffect(() => {
    if (!user) return;
    let current = true;
    api.myRegistrations()
      .then((data) => {
        if (current) setRegistrationResult({ key: registrationKey, registered: data.registrations.some((r) => r.event?._id === id) });
      })
      .catch(() => {});
    return () => { current = false; };
  }, [user, id, registrationKey]);

  async function handleRegister() {
    if (!user) {
      navigate('/login', { state: { from: `/events/${id}` } });
      return;
    }
    setBusy(true);
    setStatus('');
    try {
      await api.registerForEvent(id);
      setRegistrationResult({ key: registrationKey, registered: true });
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
      setRegistrationResult({ key: registrationKey, registered: false });
      setStatus('Registration cancelled.');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <div className="container"><p className="error">{error}</p></div>;
  if (!event) return <div className="container"><p>Loading...</p></div>;

  const isPast = currentEventResult.isPast;
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
