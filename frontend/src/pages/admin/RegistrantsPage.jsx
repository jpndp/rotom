import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client';

function RegistrantsPage() {
  const { eventId } = useParams();
  const [registrations, setRegistrations] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listEventRegistrations(eventId).then((data) => setRegistrations(data.registrations)).catch((err) => setError(err.message));
  }, [eventId]);

  return (
    <div className="container">
      <h1>Registrants</h1>
      {error && <p className="error">{error}</p>}
      <div className="list">
        {registrations.map((r) => (
          <div className="list-item" key={r._id}>
            <strong>{r.student.name}</strong>
            <span>{r.student.email}</span>
          </div>
        ))}
        {registrations.length === 0 && <p>No one has registered yet.</p>}
      </div>
    </div>
  );
}

export default RegistrantsPage;