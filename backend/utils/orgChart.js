const mongoose = require('mongoose');

const KEY = /^[A-Za-z0-9_-]{1,24}$/;
const MAX_ENTRIES = 40;

// Validates and normalizes an org chart payload. Returns { entries } or { error }.
function cleanOrgChart(input) {
  if (!Array.isArray(input) || input.length > MAX_ENTRIES) {
    return { error: `orgChart must be an array of at most ${MAX_ENTRIES} entries` };
  }
  const keys = new Set();
  const entries = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') return { error: 'Invalid org chart entry' };
    const position = typeof raw.position === 'string' ? raw.position.trim() : '';
    const name = typeof raw.name === 'string' ? raw.name.trim() : '';
    if (!position || position.length > 60 || name.length > 80) {
      return { error: 'Each entry needs a position (max 60 characters); name is max 80 characters' };
    }
    if (typeof raw.key !== 'string' || !KEY.test(raw.key) || keys.has(raw.key)) {
      return { error: 'Invalid or duplicate entry key' };
    }
    if (raw.member != null && (typeof raw.member !== 'string' || !mongoose.Types.ObjectId.isValid(raw.member))) {
      return { error: 'Invalid member id' };
    }
    keys.add(raw.key);
    entries.push({ key: raw.key, position, name, member: raw.member || undefined, reportsTo: raw.reportsTo || null });
  }
  const parent = new Map(entries.map((e) => [e.key, e.reportsTo]));
  for (const e of entries) {
    if (e.reportsTo !== null && (typeof e.reportsTo !== 'string' || !keys.has(e.reportsTo) || e.reportsTo === e.key)) {
      return { error: 'reportsTo must refer to a different entry of the same chart' };
    }
    let k = e.key;
    let steps = 0;
    while (k && steps <= entries.length) { k = parent.get(k); steps += 1; } // more steps than entries means a loop
    if (steps > entries.length) return { error: 'The org chart contains a loop' };
  }
  return { entries };
}

module.exports = { cleanOrgChart };