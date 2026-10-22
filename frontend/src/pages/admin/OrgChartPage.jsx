import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client';
import OrgChartTree from '../../components/OrgChartTree';

const newKey = () => Math.random().toString(36).slice(2, 10);
const optionLabel = (e) => [e.position || '(untitled)', e.name || e.member?.name].filter(Boolean).join(' - ');

// True if making parentKey the boss of key would create a loop.
function createsLoop(entries, key, parentKey) {
  const parentOf = new Map(entries.map((e) => [e.key, e.reportsTo]));
  for (let k = parentKey, steps = 0; k && steps <= entries.length; k = parentOf.get(k), steps += 1) {
    if (k === key) return true;
  }
  return false;
}

function OrgChartPage() {
  const { clubId } = useParams();
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getClubOrgChart(clubId)
      .then((data) => setEntries(data.orgChart.map((e) => ({ ...e, key: e.key || newKey(), reportsTo: e.reportsTo || '' }))))
      .catch((err) => setError(err.message));
  }, [clubId]);

  function updateEntry(i, field, value) {
    setEntries((es) => es.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)));
  }

  function setParent(i, parentKey) {
    if (parentKey && createsLoop(entries, entries[i].key, parentKey)) {
      setError('That would create a loop in the chart');
      return;
    }
    setError('');
    updateEntry(i, 'reportsTo', parentKey);
  }

  function addEntry() {
    setEntries((es) => [...es, { key: newKey(), position: '', name: '', reportsTo: '' }]);
  }

  function removeEntry(i) {
    setEntries((es) => {
      const removed = es[i];
      return es.filter((_, idx) => idx !== i).map((e) => (e.reportsTo === removed.key ? { ...e, reportsTo: removed.reportsTo } : e));
    });
  }

  async function handleSave() {
    setBusy(true);
    setError('');
    try {
      const payload = entries.map((e) => ({
        key: e.key, position: e.position, name: e.name, member: e.member?._id || e.member, reportsTo: e.reportsTo || null,
      }));
      await api.updateClub(clubId, { orgChart: payload });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <h1>Org Chart</h1>
      {error && <p className="error">{error}</p>}
      <OrgChartTree entries={entries} />
      <h2>Edit positions</h2>
      <div className="list">
        {entries.map((entry, i) => (
          <div className="list-item" key={entry.key} style={{ flexDirection: 'row', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input placeholder="Position" value={entry.position} onChange={(e) => updateEntry(i, 'position', e.target.value)} />
            <input placeholder="Name" value={entry.name || entry.member?.name || ''} onChange={(e) => updateEntry(i, 'name', e.target.value)} />
            <select value={entry.reportsTo} onChange={(e) => setParent(i, e.target.value)} aria-label="Reports to">
              <option value="">Top level</option>
              {entries.filter((o) => o.key !== entry.key).map((o) => <option key={o.key} value={o.key}>{optionLabel(o)}</option>)}
            </select>
            <button className="btn btn-ghost" onClick={() => removeEntry(i)}>Remove</button>
          </div>
        ))}
      </div>
      <div className="filters">
        <button className="btn btn-ghost" onClick={addEntry}>Add position</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={busy}>Save</button>
      </div>
    </div>
  );
}

export default OrgChartPage;