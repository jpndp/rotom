import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import ClubLogo from '../components/ClubLogo';

function ClubsPage() {
  const [clubs, setClubs] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    const qs = params.toString() ? `?${params.toString()}` : '';
    setLoading(true);
    api.listClubs(qs)
      .then((data) => setClubs(data.clubs))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [search, category]);

  return (
    <div className="container">
      <h1>Clubs</h1>
      <div className="filters">
        <input
          type="text"
          placeholder="Search clubs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {error && <p className="error">{error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : (
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
          {clubs.length === 0 && <p>No clubs found.</p>}
        </div>
      )}
    </div>
  );
}

export default ClubsPage;