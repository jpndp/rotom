const mongoose = require('mongoose');
const { mongoUri } = require('./env');

async function connectDB() {
  if (!mongoUri) {
    console.error('[db] MONGODB_URI is not set in .env');
    process.exit(1);
  }
  try {
    await mongoose.connect(mongoUri);
    console.log('[db] MongoDB connected');
  } catch (err) {
    console.error('[db] connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;