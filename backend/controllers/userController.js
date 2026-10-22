const { User } = require('../models');
const catchAsync = require('../utils/catchAsync');

async function listUsers(req, res) {
  const users = await User.find().select('-passwordHash');
  res.json({ users });
}

async function updateUserRole(req, res) {
  const { role, clubId } = req.body;
  if (!['student', 'club_admin', 'website_admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  const update = { role };
  if (role === 'club_admin' && clubId) update.$addToSet = { clubs: clubId };

  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-passwordHash');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
}

module.exports = {
  listUsers: catchAsync(listUsers),
  updateUserRole: catchAsync(updateUserRole),
};