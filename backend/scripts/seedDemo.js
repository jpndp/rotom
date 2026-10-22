require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const { User, Club, Event, Registration, Attendance } = require('../models');

// base = starting turnout, trend = per-event growth, attend = show-up rate
// events = [category, [4 titles]] pairs, used alternately (8 events per club)
const PROFILES = [
  {
    name: 'Coding Club', category: 'Technical', base: 60, trend: 1.15, attend: 0.7,
    events: [
      ['Workshop', ['Intro to Git and GitHub', 'Web Development Bootcamp', 'Data Structures Study Jam', 'Intro to Machine Learning']],
      ['Hackathon', ['24-Hour Campus Hackathon', 'Game Jam Weekend', 'AI Build Sprint', 'Open Source Contribution Day']],
    ],
  },
  {
    name: 'Music Society', category: 'Cultural', base: 110, trend: 0.9, attend: 0.85,
    events: [
      ['Concert', ['Acoustic Evening', 'Rock Night', 'Classical Fusion Night', 'Open Mic Concert']],
      ['Jam Session', ['Unplugged Jam', 'Drum Circle', 'Songwriting Jam', 'Campus Karaoke Jam']],
    ],
  },
  {
    name: 'Photography Club', category: 'Arts', base: 25, trend: 1.05, attend: 0.6,
    events: [
      ['Photo Walk', ['Heritage Photo Walk', 'Sunrise Campus Walk', 'Street Photography Walk', 'Monsoon Macro Walk']],
      ['Exhibition', ['Annual Photo Exhibition', 'Black and White Showcase', 'Portrait Gallery Day', 'Student Work Showcase']],
    ],
  },
];
const EVENTS = 8, STUDENTS = 150, rnd = (a, b) => a + Math.random() * (b - a);
const RESET = process.argv.includes('--reset'); // re-create the seeded events of the demo clubs

// Removes only the events this script created (description 'Seeded event'), with their registrations and attendance.
async function wipeSeeded(clubId) {
  const ids = (await Event.find({ club: clubId, description: 'Seeded event' }).select('_id')).map((e) => e._id);
  const regIds = (await Registration.find({ event: { $in: ids } }).select('_id')).map((r) => r._id);
  await Attendance.deleteMany({ registration: { $in: regIds } });
  await Registration.deleteMany({ event: { $in: ids } });
  await Event.deleteMany({ _id: { $in: ids } });
}

(async () => {
  await connectDB();
    if (!process.env.DEMO_PASSWORD || process.env.NODE_ENV === 'production') { console.error('Set DEMO_PASSWORD; never run the demo seed in production'); process.exit(1); }
  const hash = await bcrypt.hash(process.env.DEMO_PASSWORD, 10);
  const students = await User.insertMany(
    Array.from({ length: STUDENTS }, (_, i) => ({ name: `Student ${i}`, email: `student${i}@demo.edu`, passwordHash: hash, role: 'student', isActive: true })),
    { ordered: false }
  ).catch(() => User.find({ email: /^student\d+@demo\.edu$/ }));

  for (const [n, p] of PROFILES.entries()) {
    const club = (await Club.findOne({ name: p.name })) || (await Club.create({ name: p.name, category: p.category }));
    if (RESET) await wipeSeeded(club._id);
    else if (await Event.exists({ club: club._id })) { console.log(`skip ${p.name}`); continue; }
    const admin = (await User.findOne({ email: `admin${n}@demo.edu` })) ||
      (await User.create({ name: `${p.name} Admin`, email: `admin${n}@demo.edu`, passwordHash: hash, role: 'club_admin', clubs: [club._id], isActive: true }));

    for (let i = 0; i < EVENTS; i++) {
      const [category, titles] = p.events[i % 2];
      const date = new Date(Date.now() - (EVENTS - i) * 30 * 864e5);
      const ev = await Event.create({ club: club._id, title: titles[Math.floor(i / 2)], category, date, startTime: '12:00', venue: 'Main Hall', description: 'Seeded event' });
      const size = Math.min(STUDENTS, Math.round(p.base * p.trend ** i * rnd(0.8, 1.2)));
      const picked = [...students].sort(() => Math.random() - 0.5).slice(0, size);
      const regs = await Registration.insertMany(picked.map((s) => ({ student: s._id, event: ev._id, status: 'registered' })));
      await Attendance.insertMany(regs.map((r) => ({ registration: r._id, attended: Math.random() < p.attend, markedBy: admin._id })));
    }
    console.log(`seeded ${p.name}`);
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });