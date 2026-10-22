import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContextValue';
import { api } from '../../api/client';
import { useCooldown } from '../../hooks/useCooldown';
import IdeasChat from '../../components/IdeasChat';
import ClubLogo from '../../components/ClubLogo';

function AdminClubPage() {
  const { clubId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const cooldown = useCooldown(); // shared by the ideas button and the chat
  const [clubResult, setClubResult] = useState(null);
  const [eventsResult, setEventsResult] = useState(null);
  const [membershipsResult, setMembershipsResult] = useState(null);
  const [pageErrorResult, setPageErrorResult] = useState(null);
  const [ideaResult, setIdeaResult] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);

  const club = clubResult?.clubId === clubId ? clubResult.club : null;
  const events = eventsResult?.clubId === clubId ? eventsResult.events : [];
  const currentMembershipsResult = membershipsResult?.clubId === clubId ? membershipsResult : null;
  const memberships = currentMembershipsResult?.memberships || [];
  const membershipsLoading = !currentMembershipsResult;
  const membershipsError = currentMembershipsResult?.error || '';
  const error = pageErrorResult?.clubId === clubId ? pageErrorResult.error : '';
  const currentIdeaResult = ideaResult?.clubId === clubId ? ideaResult : null;
  const ideas = currentIdeaResult?.ideas || null;
  const ideasLoading = currentIdeaResult?.loading || false;
  const ideasError = currentIdeaResult?.error || '';

  async function loadEvents(targetClubId = clubId) {
    const data = await api.listEvents(`?club=${targetClubId}`);
    setEventsResult({ clubId: targetClubId, events: data.events });
  }

  async function loadMemberships(targetClubId = clubId) {
    const data = await api.listClubMemberships(targetClubId);
    setMembershipsResult({ clubId: targetClubId, memberships: data.memberships });
  }

  useEffect(() => {
    let current = true;
    api.getClub(clubId)
      .then((data) => { if (current) setClubResult({ clubId, club: data.club }); })
      .catch((err) => { if (current) setPageErrorResult({ clubId, error: err.message }); });
    api.listEvents(`?club=${clubId}`)
      .then((data) => { if (current) setEventsResult({ clubId, events: data.events }); })
      .catch((err) => { if (current) setPageErrorResult({ clubId, error: err.message }); });
    api.listClubMemberships(clubId)
      .then((data) => { if (current) setMembershipsResult({ clubId, memberships: data.memberships }); })
      .catch((err) => { if (current) setMembershipsResult({ clubId, error: err.message }); });
    return () => { current = false; };
  }, [clubId]);

  async function handleMembershipStatus(membershipId, status) {
    try {
      await api.updateClubMembership(clubId, membershipId, status);
      await loadMemberships();
    } catch (err) {
      setPageErrorResult({ clubId, error: err.message });
    }
  }

  async function handleRemoveMembership(membership) {
    const studentName = membership.student?.name || 'this student';
    if (!window.confirm(`Remove ${studentName} from this club?`)) return;
    try {
      await api.removeClubMembership(clubId, membership._id);
      await loadMemberships();
    } catch (err) {
      setPageErrorResult({ clubId, error: err.message });
    }
  }

  async function handleDelete(eventId) {
    if (!window.confirm('Remove this event?')) return;
    try {
      await api.deleteEvent(eventId);
      await loadEvents();
    } catch (err) {
      setPageErrorResult({ clubId, error: err.message });
    }
  }

  async function handleRemoveClub() {
    if (!window.confirm(`Remove "${club.name}" and all its events?`)) return;
    try {
      await api.deleteClub(clubId);
      navigate('/admin');
    } catch (err) {
      setPageErrorResult({ clubId, error: err.message });
    }
  }

  async function handleIdeas() {
    if (ideasLoading || cooldown.active) return;
    setIdeaResult({ clubId, loading: true, ideas: null, error: '' });
    try {
      const data = await api.getEventIdeas(clubId);
      setIdeaResult({ clubId, loading: false, ideas: data.ideas, error: '' });
    } catch (err) {
      if (err.status === 429) cooldown.start(60);
      const message = err.status === 504 ? 'The AI took too long to answer. Try again.'
        : err.status === 502 ? 'AI suggestions are unavailable. Try again shortly.'
          : err.status === 429 ? '' : err.message;
      setIdeaResult({ clubId, loading: false, ideas: null, error: message });
    }
  }

  if (error && !club) return <div className="container"><p className="error">{error}</p></div>;
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
        <a href="#club-members" className="btn btn-ghost">Members</a>
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
      <h2 id="club-members">Members</h2>
      {membershipsLoading ? <p>Loading members...</p> : membershipsError ? <p className="error" role="alert">{membershipsError}</p> : (
        <div className="list">
          {memberships.map((membership) => (
            <div className="list-item" key={membership._id}>
              <strong>{membership.student?.name || 'Unknown student'}</strong>
              <span>{membership.student?.email}</span>
              <span className="badge">
                {membership.status === 'active' ? 'Active member' : membership.status[0].toUpperCase() + membership.status.slice(1)}
              </span>
              <div className="filters" style={{ marginTop: '0.5rem' }}>
                {membership.status === 'pending' && (
                  <>
                    <button type="button" className="btn btn-primary" onClick={() => handleMembershipStatus(membership._id, 'active')}>Approve</button>
                    <button type="button" className="btn btn-ghost" onClick={() => handleMembershipStatus(membership._id, 'rejected')}>Reject</button>
                  </>
                )}
                <button type="button" className="btn btn-ghost" onClick={() => handleRemoveMembership(membership)}>Remove</button>
              </div>
            </div>
          ))}
          {memberships.length === 0 && <p>No members or requests yet.</p>}
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
