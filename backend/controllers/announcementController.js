const mongoose = require('mongoose');
const { Announcement, Club } = require('../models');
const catchAsync = require('../utils/catchAsync');
const { userOwnsClub } = require('../utils/ownership');

async function listAnnouncements(req, res) {
  const { club } = req.query;
  const activeClubs = await Club.distinct('_id', { isActive: true });
  let filter = { club: { $in: [...activeClubs, null] } };  if (club) {
    if (!mongoose.Types.ObjectId.isValid(club)) {
      return res.status(400).json({ error: 'Invalid club id' });
    }
    filter = { $and: [filter, { $or: [{ club }, { club: null }] }] };  }
  // no club param → return everything (used by Home dashboard and the full Announcements feed)
  const announcements = await Announcement.find(filter).sort({ createdAt: -1 });
  res.json({ announcements });
}

async function createAnnouncement(req, res) {
  const { club, title, content } = req.body;
  if (!title || !content || typeof title !== 'string' || typeof content !== 'string') {
    return res.status(400).json({ error: 'title and content are required' });
  }

  const isSiteAdmin = req.user.role === 'website_admin';

  if (!club) {
    if (!isSiteAdmin) return res.status(403).json({ error: 'Only a website_admin can post a platform-wide announcement' });
    const announcement = await Announcement.create({ club: null, postedBy: req.user.id, title, content });
    return res.status(201).json({ announcement });
  }

  if (!mongoose.Types.ObjectId.isValid(club)) return res.status(400).json({ error: 'Invalid club id' });
  const clubExists = await Club.exists({ _id: club, isActive: true });
  if (!clubExists) return res.status(404).json({ error: 'Club not found' });

  const owns = req.user.role === 'club_admin' && userOwnsClub(req.user, club);
  if (!isSiteAdmin && !owns) return res.status(403).json({ error: 'Forbidden' });

  const announcement = await Announcement.create({ club, postedBy: req.user.id, title, content });
  res.status(201).json({ announcement });
}

async function findOwnedAnnouncement(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: 'Invalid announcement id' });
    return null;
  }
  const announcement = await Announcement.findById(id);
  if (!announcement) {
    res.status(404).json({ error: 'Announcement not found' });
    return null;
  }
  const isSiteAdmin = req.user.role === 'website_admin';
  const owns = announcement.club && req.user.role === 'club_admin' && userOwnsClub(req.user, announcement.club);
  if (!isSiteAdmin && !owns) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }
  return announcement;
}

async function updateAnnouncement(req, res) {
  const announcement = await findOwnedAnnouncement(req, res);
  if (!announcement) return;

  const { title, content } = req.body;
  if (title !== undefined) {
    if (typeof title !== 'string' || !title.trim()) return res.status(400).json({ error: 'title cannot be empty' });
    announcement.title = title.trim();
  }
  if (content !== undefined) {
    if (typeof content !== 'string' || !content.trim()) return res.status(400).json({ error: 'content cannot be empty' });
    announcement.content = content.trim();
  }

  await announcement.save();
  res.json({ announcement });
}

async function deleteAnnouncement(req, res) {
  const announcement = await findOwnedAnnouncement(req, res);
  if (!announcement) return;

  await announcement.deleteOne();
  res.json({ success: true });
}

module.exports = {
  listAnnouncements: catchAsync(listAnnouncements),
  createAnnouncement: catchAsync(createAnnouncement),
  updateAnnouncement: catchAsync(updateAnnouncement),
  deleteAnnouncement: catchAsync(deleteAnnouncement),
};