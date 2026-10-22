const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const { User } = require('../models');
const catchAsync = require('../utils/catchAsync');

const requireAuth = catchAsync(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed token' });
  }
  const token = header.split(' ')[1];

  let payload;
  try {
    payload = jwt.verify(token, jwtSecret);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const user = await User.findById(payload.id).select('-passwordHash');
  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'Account no longer active' });
  }

  req.user = { id: user._id.toString(), role: user.role, clubs: user.clubs };
  next();
});

module.exports = requireAuth;