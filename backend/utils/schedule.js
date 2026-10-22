const DAY_PENALTY = [null, 0, 0, 0, 1, 2, null]; // Sun..Sat: Mon-Wed preferred, Thu-Fri fallback, weekends excluded
const LEAD_DAYS = 3;
const IST_OFFSET_MS = 5.5 * 3600 * 1000; // "today" is the India date, whatever timezone the server runs in
const iso = (d) => d.toISOString().slice(0, 10);
const earliestDate = () => iso(new Date(Date.now() + IST_OFFSET_MS + LEAD_DAYS * 86400000));

function isIsoDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !isNaN(d) && iso(d) === s;
}

function suggestSlots(blocks, { from, count = 5, horizon = 60 }) {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const slots = [];
  for (let i = 0; i < horizon; i++) {
    const d = new Date(start + i * 86400000);
    const penalty = DAY_PENALTY[d.getUTCDay()];
    const date = iso(d);
    if (penalty === null || blocks.some((b) => date >= b.startDate && date <= b.endDate)) continue;
    slots.push({ date, startTime: '12:00', penalty });
  }
  return slots.sort((a, b) => a.penalty - b.penalty || a.date.localeCompare(b.date)).slice(0, count).map(({ penalty, ...s }) => s);
}

module.exports = { suggestSlots, isIsoDate, earliestDate };