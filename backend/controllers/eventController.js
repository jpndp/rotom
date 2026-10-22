const mongoose = require('mongoose');
const { Event, Club, Membership } = require('../models');
const catchAsync = require('../utils/catchAsync');
const { userOwnsClub } = require('../utils/ownership');
const { validateUserIds } = require('../utils/validateUserRefs');

async function findEvents(req, res, clubIds) {
  const { club, from, to, when } = req.query;
  const filter = { isRemoved: false };

  if (clubIds) filter.club = { $in: clubIds };

  if (club) {
    if (!mongoose.Types.ObjectId.isValid(club)) {
      res.status(400).json({ error: 'Invalid club id' });
      return null;
    }
    if (clubIds) {
      filter.club = { $in: clubIds.filter((id) => id.toString() === club) };
    } else {
      filter.club = club;
    }
  }

  if (when === 'upcoming') filter.date = { $gte: new Date() };
  else if (when === 'past') filter.date = { $lt: new Date() };

  if (from) {
    const fromDate = new Date(from);
    if (!isNaN(fromDate)) filter.date = { ...filter.date, $gte: fromDate };
  }
  if (to) {
    const toDate = new Date(to);
    if (!isNaN(toDate)) filter.date = { ...filter.date, $lte: toDate };
  }

  return Event.find(filter).populate('club', 'name category').sort({ date: 1 });
}

async function listEvents(req, res) {
  const events = await findEvents(req, res);
  if (!events) return;
  res.json({ events });
}

async function listMyClubEvents(req, res) {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Only students can view my club events' });
  const memberships = await Membership.find({ student: req.user.id, status: 'active' }).select('club');
  const events = await findEvents(req, res, memberships.map((membership) => membership.club));
  if (!events) return;
  res.json({ events });
}

async function getEvent(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Invalid event id' });
  }
  const event = await Event.findOne({ _id: req.params.id, isRemoved: false })
    .populate('club', 'name category')
    .populate('organizers', 'name'); // name only — no email in public responses
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json({ event });
}

async function createEvent(req, res) {
  const { club, title, description, category, date, startTime, endTime, venue } = req.body;
  if (!club || !title || !date || !startTime || !venue) {
    return res.status(400).json({ error: 'club, title, date, startTime, and venue are required' });
  }
  if (!mongoose.Types.ObjectId.isValid(club)) return res.status(400).json({ error: 'Invalid club id' });

  const isSiteAdmin = req.user.role === 'website_admin';
  const owns = req.user.role === 'club_admin' && userOwnsClub(req.user, club);
  if (!isSiteAdmin && !owns) return res.status(403).json({ error: 'Forbidden: not an admin of this club' });

  const clubExists = await Club.exists({ _id: club, isActive: true });
  if (!clubExists) return res.status(404).json({ error: 'Club not found' });

  const event = await Event.create({
    club, title, description, category, date, startTime, endTime, venue,
    organizers: [req.user.id],
  });
  res.status(201).json({ event });
}

async function updateEvent(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Invalid event id' });
  }
  const event = await Event.findById(req.params.id);
  if (!event || event.isRemoved) return res.status(404).json({ error: 'Event not found' });

  const isSiteAdmin = req.user.role === 'website_admin';
  const owns = req.user.role === 'club_admin' && userOwnsClub(req.user, event.club);
  if (!isSiteAdmin && !owns) return res.status(403).json({ error: 'Forbidden' });

  if (req.body.organizers) {
    const ok = await validateUserIds(req.body.organizers);
    if (!ok) return res.status(400).json({ error: 'One or more organizer IDs are invalid' });
  }

  const allowedFields = ['title', 'description', 'category', 'date', 'startTime', 'endTime', 'venue', 'organizers'];
  for (const field of allowedFields) {
    if (field in req.body) event[field] = req.body[field];
  }
  await event.save();
  res.json({ event });
}

async function deleteEvent(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Invalid event id' });
  }
  const event = await Event.findById(req.params.id);
  if (!event || event.isRemoved) return res.status(404).json({ error: 'Event not found' });
  const isSiteAdmin = req.user.role === 'website_admin';
  const owns = req.user.role === 'club_admin' && userOwnsClub(req.user, event.club);
  if (!isSiteAdmin && !owns) return res.status(403).json({ error: 'Forbidden' });

  event.isRemoved = true;
  await event.save();
  res.json({ event });
}

module.exports = {
  listEvents: catchAsync(listEvents),
  listMyClubEvents: catchAsync(listMyClubEvents),
  getEvent: catchAsync(getEvent),
  createEvent: catchAsync(createEvent),
  updateEvent: catchAsync(updateEvent),
  deleteEvent: catchAsync(deleteEvent),
};
