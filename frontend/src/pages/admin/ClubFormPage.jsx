import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import ClubLogo from '../../components/ClubLogo';

function ClubFormPage() {
  const { clubId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(clubId);
  const [form, setForm] = useState({ name: '', description: '', category: '', logoUrl: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api.getClub(clubId).then((data) => {
      const c = data.club;
      setForm({ name: c.name, description: c.description || '', category: c.category, logoUrl: c.logoUrl || '' });
    }).catch((err) => setError(err.message));
  }, [clubId, isEdit]);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (isEdit) {
        await api.updateClub(clubId, form);
        navigate(`/admin/clubs/${clubId}`);
      } else {
        const data = await api.createClub(form);
        navigate(`/admin/clubs/${data.club._id}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container narrow">
      <h1>{isEdit ? 'Edit Club' : 'New Club'}</h1>
      <form onSubmit={handleSubmit} className="form">
        <label>Name<input value={form.name} onChange={update('name')} required /></label>
        <label>Category<input value={form.category} onChange={update('category')} required /></label>
        <label>Description<input value={form.description} onChange={update('description')} /></label>
        <label>Logo URL<input type="url" pattern="https://.*"
    title="Must start with https://" placeholder="https://example.com/logo.png" value={form.logoUrl} onChange={update('logoUrl')} /></label>
        <ClubLogo key={form.logoUrl} club={{ name: form.name || '?', logoUrl: form.logoUrl }} size={80} />
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>{isEdit ? 'Save' : 'Create'}</button>
      </form>
    </div>
  );
}

export default ClubFormPage;