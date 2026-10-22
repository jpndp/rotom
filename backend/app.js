const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const clubRoutes = require('./routes/clubRoutes');
const eventRoutes = require('./routes/eventRoutes');
const meRoutes = require('./routes/meRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '10kb' }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, skipSuccessfulRequests: true, skip: () => process.env.NODE_ENV === 'test', message: { error: 'Too many attempts, try again later' } });
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.use(['/api/auth/login', '/api/auth/signup'], authLimiter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/ai', require('./routes/ai'));
app.use('/api/me', meRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/schedule', scheduleRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid request data' });
  }
  res.status(err.status || 500).json({ error: 'Something went wrong' });
});

module.exports = app;