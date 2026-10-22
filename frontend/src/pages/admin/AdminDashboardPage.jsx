import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContextValue';
import { api } from '../../api/client';
import ClubLogo from '../../components/ClubLogo';

function AdminDashboardPage() {
  const { user } = useAuth();
  const isSiteAdmin = user.role === 'website_admin';
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        if (isSiteAdmin) {
          const data = await api.listClubs();
          setClubs(data.clubs);
        } else {
          const results = await Promise.allSettled((user.clubs || []).map((id) => api.getClub(id)));
          setClubs(results.filter((r) => r.status === 'fulfilled').map((r) => r.value.club));
                }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, isSiteAdmin]);

  async function handleRemove(club) {
    if (!window.confirm(`Remove "${club.name}" and all its events?`)) return;
    try {
      await api.deleteClub(club._id);
      setClubs((prev) => prev.filter((c) => c._id !== club._id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="container">
      <div className="dashboard-section-header">
        <h1>Club Admin Dashboard</h1>
        {isSiteAdmin && (
          <div className="filters">
            <Link to="/admin/moderation" className="btn btn-ghost">Moderate Events</Link>
            <Link to="/admin/calendar" className="btn btn-ghost">Calendar</Link>
            <Link to="/admin/clubs/new" className="btn btn-primary">New Club</Link>
          </div>
        )}      
      </div>
      {error && <p className="error">{error}</p>}
      {loading ? <p>Loading...</p> : (
        <div className="list">
          {clubs.map((club) => (
            <div className="list-item" key={club._id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link to={`/admin/clubs/${club._id}`} style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                <ClubLogo key={club.logoUrl} club={club} size={48} />
                <span>
                  <strong>{club.name}</strong>
                  <span style={{ display: 'block' }}>{club.category}</span>
                </span>
              </Link>

              <div className="filters">
                <Link to={`/admin/clubs/${club._id}/edit`} className="btn btn-ghost">Edit</Link>
                {isSiteAdmin && <button onClick={() => handleRemove(club)} className="btn btn-ghost">Remove</button>}
              </div>            </div>
          ))}
          {clubs.length === 0 && <p>No clubs to manage.</p>}
        </div>
      )}
    </div>
  );
}

export default AdminDashboardPage;
