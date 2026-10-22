require('dotenv').config();
const mongoose = require('mongoose');
const { CalendarBlock } = require('../models');

// Central Government gazetted holidays 2026 (DoPT order dated 3 Jul 2025)
const HOLIDAYS_2026 = [
  ['2026-01-26', 'Republic Day'], ['2026-03-04', 'Holi'], ['2026-03-21', 'Id-ul-Fitr'],
  ['2026-03-26', 'Ram Navami'], ['2026-03-31', 'Mahavir Jayanti'], ['2026-04-03', 'Good Friday'],
  ['2026-05-01', 'Buddha Purnima'], ['2026-05-27', 'Id-ul-Zuha (Bakrid)'], ['2026-06-26', 'Muharram'],
  ['2026-08-15', 'Independence Day'], ['2026-08-26', 'Milad-un-Nabi'], ['2026-09-04', 'Janmashtami'],
  ['2026-10-02', 'Gandhi Jayanti'], ['2026-10-20', 'Dussehra'], ['2026-11-08', 'Diwali'],
  ['2026-11-24', "Guru Nanak's Birthday"], ['2026-12-25', 'Christmas Day'],
];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await CalendarBlock.bulkWrite(HOLIDAYS_2026.map(([date, label]) => ({
    updateOne: { filter: { type: 'holiday', startDate: date }, update: { $set: { label, endDate: date } }, upsert: true },
  })));
  console.log(`Seeded ${HOLIDAYS_2026.length} holidays`);
  await mongoose.disconnect();
})().catch((err) => { console.error(err.message); process.exit(1); });