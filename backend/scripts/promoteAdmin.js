require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('../models');

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!email) throw new Error('Set ADMIN_EMAIL to the account to promote');
  if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Database:', mongoose.connection.name); // check this is the one you meant
  const user = await User.findOneAndUpdate({ email }, { role: 'website_admin' }, { returnDocument: 'after' });
  if (!user) throw new Error(`No account with email ${email}. Sign up first, then run this again.`);
  console.log(`${user.email} is now website_admin`);
}

main()
  .catch((e) => { console.error(e.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());