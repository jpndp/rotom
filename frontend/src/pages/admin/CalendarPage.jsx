import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import DatePicker from '../../components/DatePicker';

const fmt = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const EMPTY = { type: 'holiday', label: '', startDate: '', endDate: '' };

function CalendarPage() {
  const [blocks, setBlocks] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const today = new Date().toLocaleDateString('en-CA');
  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  async function load() {
    const data = await api.listScheduleBlocks();
    setBlocks(data.blocks);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    if (!form.startDate) return setError('Please select a start date');
    try {
      await api.createScheduleBlock({ ...form, endDate: form.endDate || undefined });
      setForm(EMPTY);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemove(block) {
    if (!window.confirm(`Remove "${block.label}"?`)) return;
    try {
      await api.deleteScheduleBlock(block._id);
      setBlocks((prev) => prev.filter((b) => b._id !== block._id));
    } catch (err) {
      setError(err.message);
    }
  }

  const row = (b) => (
    <div className="list-item" key={b._id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <strong>{b.label}</strong>
        <span style={{ display: 'block' }}>
          {b.type === 'midsem' ? 'Midsem' : 'Holiday'} - {fmt(b.startDate)}{b.endDate !== b.startDate && ` to ${fmt(b.endDate)}`}
        </span>
      </div>
      <button onClick={() => handleRemove(b)} className="btn btn-ghost">Remove</button>
    </div>
  );
  const upcoming = blocks.filter((b) => b.endDate >= today);
  const past = blocks.filter((b) => b.endDate < today);

  return (
    <div className="container">
      <h1>Holidays and Midsem Periods</h1>
      <p>Recommended event dates skip weekends, holidays and midsem periods.</p>
      <form onSubmit={handleAdd} className="form">
        <label>Type
          <select value={form.type} onChange={(e) => setField('type', e.target.value)}>
            <option value="holiday">Holiday</option>
            <option value="midsem">Midsem period</option>
          </select>
        </label>
        <label>Label<input value={form.label} onChange={(e) => setField('label', e.target.value)} maxLength={100} required /></label>
        <DatePicker label="Start date" value={form.startDate} blocks={blocks} onChange={(d) => setField('startDate', d)} />
        <DatePicker label="End date (optional, for ranges)" value={form.endDate} blocks={blocks} onChange={(d) => setField('endDate', d)} />
        <button type="submit" className="btn btn-primary">Add</button>
      </form>
      {error && <p className="error">{error}</p>}
      <h2>Upcoming</h2>
      <div className="list">
        {upcoming.map(row)}
        {upcoming.length === 0 && <p>None.</p>}
      </div>
      {past.length > 0 && (
        <details>
          <summary>Past ({past.length})</summary>
          <div className="list">{past.map(row)}</div>
        </details>
      )}
    </div>
  );
}

export default CalendarPage;