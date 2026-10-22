import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContextValue';

function readDismissed(storageKey) {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function PinnedAnnouncements() {
  const { user } = useAuth();
  const viewerKey = user?._id || user?.id || 'guest';
  const storageKey = `rotom:dismissed-pinned-announcements:${viewerKey}`;
  const [announcements, setAnnouncements] = useState([]);
  const [dismissalState, setDismissalState] = useState(() => ({ storageKey, ids: readDismissed(storageKey) }));
  const [error, setError] = useState('');
  const dismissed = dismissalState.storageKey === storageKey ? dismissalState.ids : readDismissed(storageKey);

  useEffect(() => {
    function load() {
      api.listAnnouncements()
        .then((data) => {
          setAnnouncements(data.announcements.filter((a) => !a.club && a.isPinned));
          setError('');
        })
        .catch((err) => {
          setAnnouncements([]);
          setError(err.message || 'Request failed');
        });
    }
    load();
    window.addEventListener('rotom:announcements-updated', load);
    return () => window.removeEventListener('rotom:announcements-updated', load);
  }, []);

  function dismiss(id) {
    const next = [...new Set([...dismissed, id])];
    localStorage.setItem(storageKey, JSON.stringify(next));
    setDismissalState({ storageKey, ids: next });
  }

  const visible = announcements.filter((announcement) => !dismissed.includes(announcement._id));
  if (!visible.length && !error) return null;

  return (
    <aside className="pinned-announcements" aria-label="Pinned website announcements">
      {error && <p className="error" role="alert">Pinned website announcements could not be loaded: {error}</p>}
      {visible.map((announcement) => (
        <div className="pinned-announcement" key={announcement._id}>
          <div>
            <strong>{announcement.title}</strong>
            <span>{announcement.content}</span>
            <Link to="/announcements">Announcements</Link>
          </div>
          <button type="button" onClick={() => dismiss(announcement._id)} aria-label={`Dismiss ${announcement.title}`} title="Dismiss announcement">
            ×
          </button>
        </div>
      ))}
    </aside>
  );
}

export default PinnedAnnouncements;
