import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContextValue';
import ClubLogo from '../components/ClubLogo';

function ClubDetailPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [club, setClub] = useState(null);
  const [events, setEvents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [error, setError] = useState('');
  const [membershipResult, setMembershipResult] = useState(null);
  const [membershipBusy, setMembershipBusy] = useState(false);
  const [membershipRetryKeys, setMembershipRetryKeys] = useState([]);
  const membershipRetryInFlight = useRef(new Set());
  const userId = user?._id || user?.id;
  const membershipKey = `${id}:${userId || 'anonymous'}`;
  const currentMembershipResult = membershipResult?.key === membershipKey ? membershipResult : null;
  const membership = currentMembershipResult?.membership;
  const membershipError = currentMembershipResult?.error || '';
  const membershipLoading = user?.role === 'student'
    && (!currentMembershipResult || membershipRetryKeys.includes(membershipKey));

  const loadMembershipStatus = useCallback(async () => {
    try {
      const data = await api.getClubMembership(id);
      setMembershipResult({ key: membershipKey, membership: data.membership });
    } catch (err) {
      setMembershipResult({ key: membershipKey, error: err.message });
    }
  }, [id, membershipKey]);

  useEffect(() => {
    api.getClub(id).then((data) => setClub(data.club)).catch((err) => setError(err.message));
    api.listEvents(`?club=${id}`).then((data) => setEvents(data.events)).catch(() => {});
    api.listAnnouncements(id).then((data) => setAnnouncements(data.announcements)).catch(() => {});
    if (user?.role === 'student') {
      api.getClubMembership(id)
        .then((data) => setMembershipResult({ key: membershipKey, membership: data.membership }))
        .catch((err) => setMembershipResult({ key: membershipKey, error: err.message }));
    }
  }, [id, user?.role, membershipKey, loadMembershipStatus]);

  async function handleMembershipRequest() {
    setMembershipBusy(true);
    try {
      const data = await api.requestClubMembership(id);
      setMembershipResult({ key: membershipKey, membership: data.membership });
    } catch (err) {
      setMembershipResult({ key: membershipKey, error: err.message });
    } finally {
      setMembershipBusy(false);
    }
  }

  async function handleMembershipRetry() {
    if (membershipRetryInFlight.current.has(membershipKey)) return;
    membershipRetryInFlight.current.add(membershipKey);
    setMembershipRetryKeys((current) => current.includes(membershipKey) ? current : [...current, membershipKey]);
    try {
      await loadMembershipStatus();
    } finally {
      membershipRetryInFlight.current.delete(membershipKey);
      setMembershipRetryKeys((current) => current.filter((key) => key !== membershipKey));
    }
  }

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
            : <><Link to="/login" state={{ from: `/clubs/${id}` }}>Log in</Link> to view the org chart and request membership.</>}
        </p>
      )}

      {!authLoading && user?.role === 'student' && (
        <section aria-label="Club membership">
          {membershipError ? (
            <div>
              <p className="error" role="alert">Membership information is unavailable: {membershipError}</p>
              <button type="button" className="btn btn-ghost" onClick={handleMembershipRetry} disabled={membershipLoading}>
                {membershipLoading ? 'Checking...' : 'Retry'}
              </button>
            </div>
          ) : membershipLoading ? <p className="status" role="status">Checking membership...</p> : membership?.status === 'active' ? (
            <p className="status" role="status">Active member</p>
          ) : membership?.status === 'pending' ? (
            <p className="status" role="status">Pending</p>
          ) : membership?.status === 'rejected' ? (
            <div>
              <p className="status" role="status">Rejected</p>
              <button type="button" className="btn btn-ghost" onClick={handleMembershipRequest} disabled={membershipBusy}>
                {membershipBusy ? 'Sending...' : 'Request again'}
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-primary" onClick={handleMembershipRequest} disabled={membershipBusy}>
              {membershipBusy ? 'Sending...' : 'Send request'}
            </button>
          )}
        </section>
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
