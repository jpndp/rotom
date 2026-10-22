const mongoose = require('mongoose');
const { Club, Event } = require('../models');
const catchAsync = require('../utils/catchAsync');
const escapeRegex = require('../utils/escapeRegex');
const { userOwnsClub } = require('../utils/ownership');
const { validateUserIds } = require('../utils/validateUserRefs');
const { cleanOrgChart } = require('../utils/orgChart');

async function listClubs(req, res) {
  const { category, search } = req.query;
  const filter = { isActive: true };
  if (category && typeof category === 'string') filter.category = category;
  if (search && typeof search === 'string') filter.name = { $regex: escapeRegex(search), $options: 'i' };
  const clubs = await Club.find(filter).select('-orgChart');
  res.json({ clubs });
}

async function getClub(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Invalid club id' });
  }
  const club = await Club.findOne({ _id: req.params.id, isActive: true }).select('-orgChart');
  if (!club) return res.status(404).json({ error: 'Club not found' });
  res.json({ club });
}

async function getClubOrgChart(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Invalid club id' });
  }
  const club = await Club.findOne({ _id: req.params.id, isActive: true }).populate('orgChart.member', 'name');
  if (!club) return res.status(404).json({ error: 'Club not found' });

  const isManager = req.user.role === 'website_admin' || (req.user.role === 'club_admin' && userOwnsClub(req.user, club._id));
  // Managers get the editable entries (with member ids); everyone else gets a display-only view without user ids.
  res.json({
    orgChart: isManager
      ? club.orgChart
      : club.orgChart.map((e) => ({ key: e.key, position: e.position, name: e.name || e.member?.name || '', reportsTo: e.reportsTo })),
  });
}

async function createClub(req, res) {
  const { name, description, category, logoUrl } = req.body;
  if (!name || !category || typeof name !== 'string' || typeof category !== 'string') {
    return res.status(400).json({ error: 'name and category are required' });
  }
  const existing = await Club.findOne({ name });
  if (existing) return res.status(409).json({ error: 'Club name already exists' });

  const club = await Club.create({ name, description, category, logoUrl });
  res.status(201).json({ club });
}

async function updateClub(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Invalid club id' });
  }
  const club = await Club.findById(req.params.id);
  if (!club) return res.status(404).json({ error: 'Club not found' });

  const isSiteAdmin = req.user.role === 'website_admin';
  const owns = req.user.role === 'club_admin' && userOwnsClub(req.user, club._id);
  if (!isSiteAdmin && !owns) return res.status(403).json({ error: 'Forbidden' });


   if ('orgChart' in req.body) {
    const cleaned = cleanOrgChart(req.body.orgChart);
    if (cleaned.error) return res.status(400).json({ error: cleaned.error });
    const ok = await validateUserIds(cleaned.entries.map((entry) => entry.member).filter(Boolean));
    if (!ok) return res.status(400).json({ error: 'One or more org chart member IDs are invalid' });
    club.orgChart = cleaned.entries;
  }

  const allowedFields = ['name', 'description', 'category', 'logoUrl'];
   for (const field of allowedFields) {
    if (field in req.body) club[field] = req.body[field];
  }
  await club.save();
  res.json({ club: await Club.findById(club._id).select('-orgChart') });
}

async function deleteClub(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Invalid club id' });
  }  
   const club = await Club.findOneAndUpdate({ _id: req.params.id, isActive: true }, { isActive: false }, { new: true }).select('-orgChart');
  if (!club) return res.status(404).json({ error: 'Club not found' });
  await Event.updateMany({ club: club._id }, { isRemoved: true });
  res.json({ club });
}

module.exports = {
  listClubs: catchAsync(listClubs),
  getClub: catchAsync(getClub),
  getClubOrgChart: catchAsync(getClubOrgChart),
  createClub: catchAsync(createClub),
  updateClub: catchAsync(updateClub),
  deleteClub: catchAsync(deleteClub),
};