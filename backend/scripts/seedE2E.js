require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { User, Club, Event, Registration, Attendance } = require('../models');

const PASSWORD = 'E2e@pass1234'; // keep in sync with frontend/e2e/fixtures.js
const IDS_FILE = path.resolve(__dirname, '../../frontend/e2e/.seed.json');
const inDays = (n) => {
  const d = new Date(Date.now() + n * 864e5);
  d.setHours(12, 0, 0, 0);
  return d;
};

(async () => {
  await connectDB();
  if (!mongoose.connection.name.endsWith('_test')) {
    console.error(`Refusing to seed "${mongoose.connection.name}": the database name must end in _test`);
    process.exit(1);
  }
  for (const M of [Attendance, Registration, Event, Club, User]) await M.deleteMany({});

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const mk = (name, email, role, clubs) => ({ name, email, passwordHash, role, isActive: true, ...(clubs ? { clubs } : {}) });

  const [robotics, debate] = await Club.create([
    { name: 'Robotics Club', category: 'Technical' },
    { name: 'Debate Society', category: 'Cultural' },
  ]);
  const [, student2] = await User.create([
    mk('E2E Student', 'e2e.student@demo.edu', 'student'),
    mk('E2E Student Two', 'e2e.student2@demo.edu', 'student'),
  ]);
  await User.create([
    mk('E2E Robotics Admin', 'e2e.robotics@demo.edu', 'club_admin', [robotics._id]),
    mk('E2E Debate Admin', 'e2e.debate@demo.edu', 'club_admin', [debate._id]),
    mk('E2E Website Admin', 'e2e.webadmin@demo.edu', 'website_admin'),
  ]);

  const base = { startTime: '12:00', venue: 'Main Hall', description: 'E2E event' };
  const workshop = await Event.create({ ...base, club: robotics._id, title: 'Robotics Workshop', category: 'Workshop', date: inDays(14) });
  await Event.create({ ...base, club: robotics._id, title: 'Robotics Showcase', category: 'Exhibition', date: inDays(21) });
  await Event.create({ ...base, club: robotics._id, title: 'Robotics Cleanup Day', category: 'Workshop', date: inDays(28) });
  const debateNight = await Event.create({ ...base, club: debate._id, title: 'Debate Night', category: 'Workshop', date: inDays(14) });
  await Registration.create({ student: student2._id, event: workshop._id, status: 'registered' });

  fs.writeFileSync(IDS_FILE, JSON.stringify({
    roboticsId: String(robotics._id),
    debateId: String(debate._id),
    workshopId: String(workshop._id),
    debateNightId: String(debateNight._id),
  }, null, 2));

  console.log('e2e seed done');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
