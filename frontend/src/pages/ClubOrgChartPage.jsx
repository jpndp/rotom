import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import OrgChartTree from '../components/OrgChartTree';

function ClubOrgChartPage() {
  const { id } = useParams();
  const [club, setClub] = useState(null);
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getClub(id).then((data) => setClub(data.club)).catch((err) => setError(err.message));
    api.getClubOrgChart(id).then((data) => setEntries(data.orgChart)).catch((err) => setError(err.message));
  }, [id]);

  return (
    <div className="container">
      <h1>{club ? `${club.name} - Org Chart` : 'Org Chart'}</h1>
      <p><Link to={`/clubs/${id}`}>Back to club</Link></p>
      {error && <p className="error">{error}</p>}
      {entries && <OrgChartTree entries={entries} />}
    </div>
  );
}

export default ClubOrgChartPage;