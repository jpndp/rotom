const mongoose = require('mongoose');
const { Event, Registration, Attendance } = require('../models');
const catchAsync = require('../utils/catchAsync');
const { userOwnsClub } = require('../utils/ownership');

async function listAttendance(req, res) {
  const { id: eventId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ error: 'Invalid event id' });
  }
  const event = await Event.findOne({ _id: eventId, isRemoved: false });
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const isSiteAdmin = req.user.role === 'website_admin';
  const owns = req.user.role === 'club_admin' && userOwnsClub(req.user, event.club);
  if (!isSiteAdmin && !owns) return res.status(403).json({ error: 'Forbidden' });

  const registrations = await Registration.find({ event: eventId, status: 'registered' }).populate('student', 'name');
  const records = await Attendance.find({ registration: { $in: registrations.map((r) => r._id) } });
  const attendedMap = new Map(records.map((r) => [r.registration.toString(), r.attended]));

  const attendance = registrations.map((r) => ({
    registrationId: r._id,
    student: { name: r.student.name },
    attended: attendedMap.get(r._id.toString()) || false,
  }));

  res.json({ attendance });
}

async function markAttendance(req, res) {
  const { id: eventId } = req.params;
  const { registrationId, attended } = req.body;
  if (!mongoose.Types.ObjectId.isValid(eventId) || !mongoose.Types.ObjectId.isValid(registrationId)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  if (typeof attended !== 'boolean') {
      return res.status(400).json({ error: 'attended must be a boolean' });
  }

  const event = await Event.findOne({ _id: eventId, isRemoved: false });

  if (!event) return res.status(404).json({ error: 'Event not found' });

  const isSiteAdmin = req.user.role === 'website_admin';
  const owns = req.user.role === 'club_admin' && userOwnsClub(req.user, event.club);
  if (!isSiteAdmin && !owns) return res.status(403).json({ error: 'Forbidden' });

  // Confirm this registration actually belongs to THIS event — prevents marking attendance via an unrelated registration id
  const registration = await Registration.findOne({ _id: registrationId, event: eventId });
  if (!registration) return res.status(404).json({ error: 'Registration not found for this event' });

  const record = await Attendance.findOneAndUpdate(
    { registration: registrationId },
    { attended, markedBy: req.user.id },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json({ attendance: record });
}

module.exports = {
  listAttendance: catchAsync(listAttendance),
  markAttendance: catchAsync(markAttendance),
};