import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

function AnnouncementsPage() {
  const { clubId } = useParams();
  const { user } = useAuth();
  const isSiteAdmin = user?.role === 'website_admin';

  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [scope, setScope] = useState('club'); // 'club' | 'worldwide'
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  function load() {
    api.listAnnouncements(clubId).then((data) => setAnnouncements(data.announcements)).catch((err) => setError(err.message));
  }

  useEffect(load, [clubId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = { title, content };
      if (scope === 'club') payload.club = clubId;
      // scope === 'worldwide' → no club field at all, backend treats that as platform-wide
      await api.createAnnouncement(payload);
      setTitle('');
      setContent('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(a) {
    setEditingId(a._id);
    setEditTitle(a.title);
    setEditContent(a.content);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id) {
    setBusy(true);
    setError('');
    try {
      await api.updateAnnouncement(id, { title: editTitle, content: editContent });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this announcement? This cannot be undone.')) return;
    setBusy(true);
    setError('');
    try {
      await api.deleteAnnouncement(id);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <h1>Announcements</h1>
      <form onSubmit={handleSubmit} className="form" style={{ marginBottom: '1.5rem' }}>
        <label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} required /></label>
        <label>Content<input value={content} onChange={(e) => setContent(e.target.value)} required /></label>
        {isSiteAdmin && (
          <label>
            Visibility
            <select value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="club">This club only</option>
              <option value="worldwide">Worldwide (all clubs)</option>
            </select>
          </label>
        )}
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          Post{isSiteAdmin && scope === 'worldwide' ? ' worldwide' : ''}
        </button>
      </form>
      <div className="list">
        {announcements.map((a) => (
          <div className="list-item" key={a._id}>
            {editingId === a._id ? (
              <div className="form">
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                <input value={editContent} onChange={(e) => setEditContent(e.target.value)} />
                <div className="filters">
                  <button className="btn btn-primary" onClick={() => saveEdit(a._id)} disabled={busy}>Save</button>
                  <button className="btn btn-ghost" onClick={cancelEdit}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <strong>{a.title}</strong>
                {!a.club && <span className="badge">Worldwide</span>}
                <span>{a.content}</span>
                <div className="filters" style={{ marginTop: '0.5rem' }}>
                  <button className="btn btn-ghost" onClick={() => startEdit(a)}>Edit</button>
                  <button className="btn btn-ghost" onClick={() => handleDelete(a._id)} disabled={busy}>Delete</button>
                </div>
              </>
            )}
          </div>
        ))}
        {announcements.length === 0 && <p>No announcements yet.</p>}
      </div>
    </div>
  );
}

export default AnnouncementsPage;