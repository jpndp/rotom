const mongoose = require('mongoose');
const { Club, Membership } = require('../models');
const catchAsync = require('../utils/catchAsync');
const { userOwnsClub } = require('../utils/ownership');

async function findManagedClub(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ error: 'Invalid club id' });
    return null;
  }
  const club = await Club.findOne({ _id: req.params.id, isActive: true });
  if (!club) {
    res.status(404).json({ error: 'Club not found' });
    return null;
  }
  const isSiteAdmin = req.user.role === 'website_admin';
  const owns = req.user.role === 'club_admin' && userOwnsClub(req.user, club._id);
  if (!isSiteAdmin && !owns) {
    res.status(403).json({ error: 'Forbidden: not an admin of this club' });
    return null;
  }
  return club;
}

async function getMyMembership(req, res) {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Only students can view their membership status' });
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid club id' });
  const club = await Club.findOne({ _id: req.params.id, isActive: true });
  if (!club) return res.status(404).json({ error: 'Club not found' });
  const membership = await Membership.findOne({ club: club._id, student: req.user.id });
  res.json({ membership });
}

async function requestMembership(req, res) {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Only students can request to join clubs' });
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid club id' });
  const club = await Club.findOne({ _id: req.params.id, isActive: true });
  if (!club) return res.status(404).json({ error: 'Club not found' });

  let membership = await Membership.findOne({ club: club._id, student: req.user.id });
  if (membership) {
    if (membership.status === 'rejected') {
      membership.status = 'pending';
      await membership.save();
    }
    return res.json({ membership });
  }

  try {
    membership = await Membership.create({ club: club._id, student: req.user.id, status: 'pending' });
  } catch (err) {
    if (err.code !== 11000) throw err;
    membership = await Membership.findOne({ club: club._id, student: req.user.id });
  }
  res.status(201).json({ membership });
}

async function listClubMemberships(req, res) {
  const club = await findManagedClub(req, res);
  if (!club) return;
  const memberships = await Membership.find({ club: club._id })
    .populate('student', 'name email')
    .sort({ status: 1, createdAt: 1 });
  res.json({ memberships });
}

async function updateClubMembership(req, res) {
  const club = await findManagedClub(req, res);
  if (!club) return;
  const { membershipId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(membershipId)) return res.status(400).json({ error: 'Invalid membership id' });
  const { status } = req.body;
  if (!['pending', 'rejected', 'active'].includes(status)) {
    return res.status(400).json({ error: 'status must be pending, rejected, or active' });
  }
  const membership = await Membership.findOneAndUpdate(
    { _id: membershipId, club: club._id },
    { status },
    { new: true, runValidators: true }
  ).populate('student', 'name email');
  if (!membership) return res.status(404).json({ error: 'Membership not found' });
  res.json({ membership });
}

async function removeClubMembership(req, res) {
  const club = await findManagedClub(req, res);
  if (!club) return;
  const { membershipId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(membershipId)) return res.status(400).json({ error: 'Invalid membership id' });
  const membership = await Membership.findOneAndDelete({ _id: membershipId, club: club._id });
  if (!membership) return res.status(404).json({ error: 'Membership not found' });
  res.json({ success: true });
}

module.exports = {
  getMyMembership: catchAsync(getMyMembership),
  requestMembership: catchAsync(requestMembership),
  listClubMemberships: catchAsync(listClubMemberships),
  updateClubMembership: catchAsync(updateClubMembership),
  removeClubMembership: catchAsync(removeClubMembership),
};
