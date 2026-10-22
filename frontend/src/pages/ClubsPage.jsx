import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import ClubLogo from '../components/ClubLogo';

function ClubsPage() {
  const [search, setSearch] = useState('');
  const [result, setResult] = useState(null);
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  const query = params.toString() ? `?${params.toString()}` : '';
  const currentResult = result?.query === query ? result : null;
  const clubs = currentResult?.clubs || [];
  const error = currentResult?.error || '';
  const loading = !currentResult;

  useEffect(() => {
    let current = true;
    api.listClubs(query)
      .then((data) => {
        if (current) setResult({ query, clubs: data.clubs, error: '' });
      })
      .catch((err) => {
        if (current) setResult({ query, clubs: [], error: err.message });
      });
    return () => { current = false; };
  }, [query]);

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
