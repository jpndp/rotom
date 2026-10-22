require('dotenv').config();
const mongoose = require('mongoose');
const { User, Club } = require('../models');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function main() {
  const email = (process.env.USER_EMAIL || '').trim();
  const clubName = (process.env.CLUB_NAME || '').trim();
  if (!email || !clubName) throw new Error('Set USER_EMAIL and CLUB_NAME');
  if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Database:', mongoose.connection.name); // check this is the one you meant

  const club = await Club.findOne({ name: clubName, isActive: true });
  if (!club) {
    const names = (await Club.find({ isActive: true }).select('name').lean()).map((c) => c.name);
    throw new Error(`No active club named "${clubName}". Clubs: ${names.join(', ')}`);
  }

  const emailMatch = { email: new RegExp(`^${escapeRegex(email)}$`, 'i') }; // case-insensitive
  const existing = await User.findOne(emailMatch);
  if (!existing) throw new Error(`No account with email ${email}. Sign up first, then run this again.`);
  if (existing.role === 'website_admin') throw new Error('That account is a website_admin; leaving it alone.');

  const user = await User.findByIdAndUpdate(
    existing._id,
    { role: 'club_admin', $addToSet: { clubs: club._id } },
    { returnDocument: 'after' }
  );
  console.log(`${user.email} is now club_admin of ${club.name}`);
}

main()
  .catch((e) => { console.error(e.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());