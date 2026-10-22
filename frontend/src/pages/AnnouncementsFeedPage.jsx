import { useEffect, useState } from 'react';
import { api } from '../api/client';

function AnnouncementsFeedPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listAnnouncements()
      .then((data) => setAnnouncements(data.announcements))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container">
      <h1>Announcements</h1>
      {error && <p className="error">{error}</p>}
      {loading ? <p>Loading...</p> : (
        <div className="list">
          {announcements.map((a) => (
            <div className="list-item" key={a._id}>
              <strong>{a.title}</strong>
              <span>{a.content}</span>
              <span>{new Date(a.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
          {announcements.length === 0 && <p>No announcements yet.</p>}
        </div>
      )}
    </div>
  );
}

export default AnnouncementsFeedPage;