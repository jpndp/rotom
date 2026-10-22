import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

function ProfilePage() {
  const { user, loading, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const payload = { name };
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }
      await api.updateMe(payload);
      await refreshUser();
      setCurrentPassword('');
      setNewPassword('');
      setStatus('Profile updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container narrow">
      <h1>My Profile</h1>
      <form onSubmit={handleSubmit} className="form">
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Email
          <input value={user.email} disabled />
        </label>
        <label>
          Current password <span className="meta">(only needed if changing password)</span>
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        </label>
        <label>
          New password
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} />
        </label>
        {error && <p className="error">{error}</p>}
        {status && <p className="status">{status}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>Save</button>
      </form>
    </div>
  );
}

export default ProfilePage;