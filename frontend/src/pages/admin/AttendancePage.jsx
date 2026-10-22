import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client';

function AttendancePage() {
  const { eventId } = useParams();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listAttendance(eventId)
      .then((data) => setRows(data.attendance))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [eventId]);

  async function toggle(registrationId, attended) {
    try {
      await api.markAttendance(eventId, registrationId, !attended);
      setRows((rs) => rs.map((r) => (r.registrationId === registrationId ? { ...r, attended: !attended } : r)));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="container">
      <h1>Attendance</h1>
      {error && <p className="error">{error}</p>}
      {loading ? <p>Loading...</p> : (
        <div className="list">
                  {rows.map((r) => (
            <div
              className={`list-item attendance-row ${r.attended ? 'attendance-row-present' : ''}`}
              key={r.registrationId}
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>{r.student.name}</span>
              <button className={r.attended ? 'btn btn-primary' : 'btn btn-ghost'} onClick={() => toggle(r.registrationId, r.attended)}>
                {r.attended ? 'Mark as absent' : 'Mark present'}
              </button>
            </div>
          ))}  
          {rows.length === 0 && <p>No registrants to mark.</p>}
        </div>
      )}
    </div>
  );
}

export default AttendancePage;