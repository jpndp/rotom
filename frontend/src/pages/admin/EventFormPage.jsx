import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../api/client';
import DatePicker from '../../components/DatePicker';

function EventFormPage() {
  const { clubId, eventId } = useParams();
  const navigate = useNavigate();
  const idea = useLocation().state?.idea; // set by "Use this idea" on the club page
  const isEdit = Boolean(eventId);
  const [form, setForm] = useState({
    title: idea?.title || '', description: idea?.why || '', category: idea?.category || '',
    date: '', startTime: isEdit ? '' : '12:00', endTime: '', venue: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [blocks, setBlocks] = useState([]);

  useEffect(() => {
    if (!isEdit) return;
    api.getEvent(eventId).then((data) => {
      const e = data.event;
      setForm({
        title: e.title, description: e.description || '', category: e.category || '',
        date: e.date.slice(0, 10), startTime: e.startTime, endTime: e.endTime || '', venue: e.venue,
      });
    }).catch((err) => setError(err.message));
  }, [eventId, isEdit]);

  useEffect(() => {
    api.getScheduleSuggestions().then((data) => setSuggestions(data.suggestions.map((s) => s.date))).catch(() => {});
    api.listScheduleBlocks().then((data) => setBlocks(data.blocks)).catch(() => {});
  }, []);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.date) return setError('Please select a date');
    setBusy(true);
    setError('');
    try {
      if (isEdit) {
        await api.updateEvent(eventId, form);
      } else {
        await api.createEvent({ ...form, club: clubId });
      }
      navigate(`/admin/clubs/${clubId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container narrow">
      <h1>{isEdit ? 'Edit Event' : 'New Event'}</h1>
      <form onSubmit={handleSubmit} className="form">
        <label>Title<input value={form.title} onChange={update('title')} required /></label>
        <label>Description<input value={form.description} onChange={update('description')} /></label>
        <label>Category<input value={form.category} onChange={update('category')} /></label>
        <DatePicker
          value={form.date}
          recommended={suggestions}
          blocks={blocks}
          onChange={(date) => setForm((f) => ({ ...f, date, startTime: f.startTime || '12:00' }))}
        />
        <label>Start time<input type="time" value={form.startTime} onChange={update('startTime')} required /></label>
        <label>End time<input type="time" value={form.endTime} onChange={update('endTime')} /></label>
        <label>Venue<input value={form.venue} onChange={update('venue')} required /></label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>{isEdit ? 'Save' : 'Create'}</button>
      </form>
    </div>
  );
}

export default EventFormPage;