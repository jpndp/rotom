const router = require('express').Router();
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const { Club, Event, Registration, Attendance } = require('../models');
const requireAuth = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');
const { userOwnsClub } = require('../utils/ownership');
const { generateIdeas, chatIdeas } = require('../services/ai');

// Gemini free tier: 3 req/min per key. One shared cap plus a per-user cap; both routes share the same counters.
const limiter = (max, keyGenerator) => rateLimit({
  windowMs: 60_000,
  max,
  keyGenerator,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Too many requests, try again in a minute' },
});
const userLimit = limiter(2, (req) => String(req.user.id || req.user._id));
const globalLimit = limiter(3, () => 'ai');
const adminOnly = (req, res, next) => (
  ['club_admin', 'website_admin'].includes(req.user.role) ? next() : res.status(403).json({ error: 'Forbidden' })
);
const aiGuards = [requireAuth, adminOnly, userLimit, globalLimit];

const count = (arr, id, key) => arr.find((x) => String(x._id) === String(id))?.[key] || 0;
const avg = (list) => (
  list.length ? Math.round(list.reduce((sum, e) => sum + e.attended, 0) / list.length) : null
);

// Authorizes the caller for the club and returns its aggregated stats, or null after sending an error.
async function loadStats(req, res) {
  const { clubId } = req.params;
  const isSiteAdmin = req.user.role === 'website_admin';
  const owns = req.user.role === 'club_admin' && userOwnsClub(req.user, clubId);
  if (!isSiteAdmin && !owns) { res.status(403).json({ error: 'Forbidden' }); return null; }
  if (!mongoose.Types.ObjectId.isValid(clubId)) { res.status(400).json({ error: 'Invalid club id' }); return null; }

  const club = await Club.findOne({ _id: clubId, isActive: true }).select('name category').lean();
  if (!club) { res.status(404).json({ error: 'Club not found' }); return null; }

  const events = await Event.find({ club: clubId, isRemoved: false, date: { $lt: new Date() } })
    .sort({ date: -1 }).limit(10).select('title category date').lean();
  const ids = events.map((e) => e._id);

  const regs = await Registration.aggregate([
    { $match: { event: { $in: ids }, status: 'registered' } },
    { $group: { _id: '$event', registered: { $sum: 1 } } },
  ]);

  // Start from this club's registrations, then look up only their attendance records.
  const att = await Registration.aggregate([
    { $match: { event: { $in: ids }, status: 'registered' } },
    {
      $lookup: {
        from: Attendance.collection.name,
        localField: '_id',
        foreignField: 'registration',
        pipeline: [{ $match: { attended: true } }],
        as: 'a',
      },
    },
    { $group: { _id: '$event', attended: { $sum: { $size: '$a' } } } },
  ]);

  const pastEvents = events.map((e) => ({
    title: String(e.title ?? '').slice(0, 120),
    category: e.category,
    date: e.date,
    registered: count(regs, e._id, 'registered'),
    attended: count(att, e._id, 'attended'),
  }));
  const split = Math.ceil(pastEvents.length / 2); // newest first: the first half is the recent half
  const trend = {
    recentAvgAttended: avg(pastEvents.slice(0, split)),
    earlierAvgAttended: avg(pastEvents.slice(split)),
  };
  return { club: club.name, genre: club.category, pastEvents, trend };
}

// Runs an AI call; on failure sends 429, 504 or 502 and returns null.
async function askAi(res, call) {
  try {
    return await call();
  } catch (e) {
    console.error('AI request failed:', e.status || '', e.message);
    const status = [429, 504].includes(e.status) ? e.status : 502;
    if (status === 429) res.set('Retry-After', '60');
    const messages = {
      429: 'AI is busy, try again in a minute',
      504: 'AI request timed out, try again',
    };
    res.status(status).json({ error: messages[status] || 'AI suggestions are unavailable, try again shortly' });
    return null;
  }
}

// Valid chat history: alternating user/assistant, starting and ending with the user, short messages.
function parseMessages(m) {
  if (!Array.isArray(m) || m.length === 0 || m.length > 11 || m.length % 2 === 0) return null;
  const ok = m.every((x, i) => x && x.role === (i % 2 === 0 ? 'user' : 'assistant')
    && typeof x.content === 'string' && x.content.trim() && x.content.length <= 500);
  return ok ? m.map((x) => ({ role: x.role, content: x.content.trim() })) : null;
}

router.post('/event-ideas/:clubId', aiGuards, catchAsync(async (req, res) => {
  const stats = await loadStats(req, res);
  if (!stats) return;
  const ideas = await askAi(res, () => generateIdeas(stats));
  if (ideas) res.json({ ideas });
}));

router.post('/chat/:clubId', aiGuards, catchAsync(async (req, res) => {
  const stats = await loadStats(req, res);
  if (!stats) return;
  const messages = parseMessages(req.body?.messages);
  if (!messages) return res.status(400).json({ error: 'Invalid messages' });
  const result = await askAi(res, () => chatIdeas(stats, messages));
  if (result) res.json(result);
}));

module.exports = router;