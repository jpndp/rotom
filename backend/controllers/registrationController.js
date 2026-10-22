const mongoose = require('mongoose');
const { Registration, Event } = require('../models');
const catchAsync = require('../utils/catchAsync');
const { userOwnsClub } = require('../utils/ownership');

async function registerForEvent(req, res) {
  const { id: eventId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return res.status(400).json({ error: 'Invalid event id' });
  }
  const event = await Event.findOne({ _id: eventId, isRemoved: false });
  if (!event) return res.status(404).json({ error: 'Event not found' });

  if (event.date.getTime() + 864e5 < Date.now()) return res.status(400).json({ error: 'Registration is closed for past events' });

  const existing = await Registration.findOne({ student: req.user.id, event: eventId });
    if (existing) {
    if (existing.status === 'registered') {
      return res.status(409).json({ error: 'Already registered for this event' });
    }
    existing.status = 'registered';
    await existing.save();
    return res.status(200).json({ registration: existing });
  }

  const registration = await Registration.create({ student: req.user.id, event: eventId });
  res.status(201).json({ registration });
}

async function cancelRegistration(req, res) {
  const { id: eventId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return res.status(400).json({ error: 'Invalid event id' });
  }
  const registration = await Registration.findOne({ student: req.user.id, event: eventId });
  if (!registration || registration.status === 'cancelled') {
    return res.status(404).json({ error: 'Registration not found' });
  }
  registration.status = 'cancelled';
  await registration.save();
  res.json({ registration });
}

async function myRegistrations(req, res) {
  const registrations = await Registration.find({ student: req.user.id, status: 'registered' })    .populate({
      path: 'event',
      match: { isRemoved: false },
      populate: { path: 'club', select: 'name category' },
    })
    .sort({ createdAt: -1 });
  res.json({ registrations: registrations.filter((r) => r.event) });
}

async function listEventRegistrations(req, res) {
  const { id: eventId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return res.status(400).json({ error: 'Invalid event id' });
  }
   const event = await Event.findOne({ _id: eventId, isRemoved: false });
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const isSiteAdmin = req.user.role === 'website_admin';
  const owns = req.user.role === 'club_admin' && userOwnsClub(req.user, event.club);
  if (!isSiteAdmin && !owns) return res.status(403).json({ error: 'Forbidden' });

  const registrations = await Registration.find({ event: eventId, status: 'registered' })
    .populate('student', 'name email');
  res.json({ registrations });
}

module.exports = {
  registerForEvent: catchAsync(registerForEvent),
  cancelRegistration: catchAsync(cancelRegistration),
  myRegistrations: catchAsync(myRegistrations),
  listEventRegistrations: catchAsync(listEventRegistrations),
};