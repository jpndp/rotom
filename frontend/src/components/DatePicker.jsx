import { useEffect, useRef, useState } from 'react';

const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const pad = (n) => String(n).padStart(2, '0');
const toIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (iso) => new Date(`${iso}T00:00:00`);

function DatePicker({ label = 'Date', value, onChange, recommended = [], blocks = [] }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const ref = useRef(null);
  const todayIso = toIso(new Date());
  const blockFor = (iso) => blocks.find((b) => iso >= b.startDate && iso <= b.endDate);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  function toggle() {
    if (!open) {
      const d = value ? parse(value) : new Date();
      setView(new Date(d.getFullYear(), d.getMonth(), 1));
    }
    setOpen(!open);
  }

  const shift = (n) => setView((v) => new Date(v.getFullYear(), v.getMonth() + n, 1));
  const total = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();

  return (
    <div className="datepicker" ref={ref}>
      <span>{label}</span>
      <button type="button" className="btn btn-ghost datepicker-toggle" onClick={toggle}>
        {value ? parse(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Select date'}
      </button>
      {open && (
        <div className="datepicker-pop">
          <div className="datepicker-head">
            <button type="button" onClick={() => shift(-1)} aria-label="Previous month">&lsaquo;</button>
            <strong>{view.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong>
            <button type="button" onClick={() => shift(1)} aria-label="Next month">&rsaquo;</button>
          </div>
          <div className="datepicker-grid">
            {DOW.map((d) => <span key={d} className="datepicker-dow">{d}</span>)}
            {Array.from({ length: view.getDay() }, (_, i) => <span key={`b${i}`} />)}
            {Array.from({ length: total }, (_, i) => {
              const day = new Date(view.getFullYear(), view.getMonth(), i + 1);
              const iso = toIso(day);
              const block = blockFor(iso);
              const cls = ['datepicker-day', iso === todayIso && 'today', iso < todayIso && 'past', recommended.includes(iso) && 'rec', (block || [0, 6].includes(day.getDay())) && 'blocked', iso === value && 'selected']                
              .filter(Boolean).join(' ');
              return <button type="button" key={iso} title={block?.label} className={cls} onClick={() => { onChange(iso); setOpen(false); }}>{i + 1}</button>;
            })}
          </div>
          <p className="datepicker-note">Highlighted dates are recommendations. Red dates are weekends, holidays or midsem periods.</p>
        </div>
      )}
    </div>
  );
}

export default DatePicker;