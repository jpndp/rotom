const mongoose = require('mongoose');
const { User } = require('../models');

async function validateUserIds(ids = []) {
  if (!Array.isArray(ids) || ids.length === 0) return true;
  const validFormat = ids.every((id) => mongoose.Types.ObjectId.isValid(id));
  if (!validFormat) return false;
  const count = await User.countDocuments({ _id: { $in: ids }, isActive: true });
  return count === new Set(ids.map(String)).size;
}

module.exports = { validateUserIds };