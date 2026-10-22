import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const pad = (n) => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parse = (s) => new Date(`${s.slice(0, 10)}T00:00:00`);
const dayLabel = (s) => parse(s).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

function EventsPage() {
  const now = new Date();
  const todayIso = iso(now.getFullYear(), now.getMonth(), now.getDate());
  const [mode, setMode] = useState('list');
  const [when, setWhen] = useState('upcoming');
  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [events, setEvents] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const total = new Date(y, m + 1, 0).getDate();

  useEffect(() => {
    api.listScheduleBlocks().then((data) => setBlocks(data.blocks)).catch(() => {});
  }, []);

  useEffect(() => {
    let query = `?from=${todayIso}`;
    if (mode === 'list') query = `?when=${when}`;
    else if (mode === 'month') query = `?from=${iso(y, m, 1)}&to=${iso(y, m, total)}`;
    setLoading(true);
    api.listEvents(query)
      .then((data) => { setEvents(data.events); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [mode, when, y, m, total, todayIso]);

  const byDate = events.reduce((acc, e) => {
    const d = e.date.slice(0, 10);
    (acc[d] = acc[d] || []).push(e);
    return acc;
  }, {});
  const blockFor = (date) => blocks.find((b) => date >= b.startDate && date <= b.endDate);
  const shift = (n) => { setCursor(new Date(y, m + n, 1)); setSelected(null); };
  const shown = selected ? byDate[selected] || [] : events;
  const selectedBlock = selected && blockFor(selected);

  const eventRow = (e) => (
    <li key={e._id}>
      <Link to={`/events/${e._id}`}>{e.title}</Link>
      <span style={{ display: 'block' }}>{e.startTime}{e.endTime && ` - ${e.endTime}`}, {e.club?.name}, {e.venue}</span>
    </li>
  );
  const tab = (value, label) => (
    <button type="button" className={`btn ${mode === value ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMode(value)}>{label}</button>
  );

  return (
    <div className="container">
      <h1>Events</h1>
      <div className="filters">
        {tab('list', 'List')}{tab('month', 'Month')}{tab('schedule', 'Schedule')}
        <Link to="/announcements" className="btn btn-ghost">Announcements</Link>
      </div>
      {mode === 'list' && (
        <div className="filters">
          <button className={when === 'upcoming' ? 'btn btn-primary' : 'btn btn-ghost'} onClick={() => setWhen('upcoming')}>Upcoming</button>
          <button className={when === 'past' ? 'btn btn-primary' : 'btn btn-ghost'} onClick={() => setWhen('past')}>Past</button>
        </div>
      )}
      {error && <p className="error">{error}</p>}

      {mode === 'list' && (loading ? <p>Loading...</p> : (
        <div className="list">
          {events.map((event) => (
            <Link to={`/events/${event._id}`} key={event._id} className="list-item">
              <strong>{event.title}</strong>
              <span>{event.club?.name} - {parse(event.date).toLocaleDateString()} - {event.venue}</span>
            </Link>
          ))}
          {events.length === 0 && <p>No events found.</p>}
        </div>
      ))}

      {mode === 'month' && (
        <div className="event-calendar">
          <div className="event-calendar-head">
            <button type="button" onClick={() => shift(-1)} aria-label="Previous month">&lsaquo;</button>
            <strong>{cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong>
            <button type="button" onClick={() => shift(1)} aria-label="Next month">&rsaquo;</button>
          </div>
          <div className="event-calendar-grid">
            {DOW.map((d) => <span key={d} className="event-calendar-dow">{d}</span>)}
            {Array.from({ length: cursor.getDay() }, (_, i) => <span key={`b${i}`} />)}
            {Array.from({ length: total }, (_, i) => {
              const date = iso(y, m, i + 1);
              const block = blockFor(date);
              const weekend = [0, 6].includes(new Date(y, m, i + 1).getDay());
              const cls = ['event-calendar-day', date === todayIso && 'today', date < todayIso && 'past', byDate[date] && 'has-events', (block || weekend) && 'blocked', date === selected && 'selected']
                .filter(Boolean).join(' ');
              return <button type="button" key={date} title={block?.label} className={cls} onClick={() => setSelected(date === selected ? null : date)}>{i + 1}</button>;
            })}
          </div>
          <h3>{selected ? dayLabel(selected) : 'All events this month'}</h3>
          {selectedBlock && <p className="event-calendar-blocked">{selectedBlock.type === 'midsem' ? 'Midsem period' : 'Holiday'}: {selectedBlock.label}</p>}
          <ul className="event-calendar-list">
            {shown.map(eventRow)}
            {shown.length === 0 && <li>No events.</li>}
          </ul>
          <p className="event-calendar-note">Highlighted dates have events. Red dates are weekends, holidays or midsem periods.</p>
        </div>
      )}

      {mode === 'schedule' && (
        <div className="event-calendar">
          {Object.entries(byDate).map(([date, list]) => (
            <div key={date}>
              <h3>{dayLabel(date)}</h3>
              <ul className="event-calendar-list">{list.map(eventRow)}</ul>
            </div>
          ))}
          {events.length === 0 && <p>No upcoming events.</p>}
        </div>
      )}
    </div>
  );
}

export default EventsPage;