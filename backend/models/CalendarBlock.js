const { Schema, model } = require('mongoose');

const calendarBlockSchema = new Schema(
  {
    type: { type: String, enum: ['holiday', 'midsem'], required: true },
    label: { type: String, required: true, trim: true, maxlength: 100 },
    startDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    endDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  },
  { timestamps: true }
);

module.exports = model('CalendarBlock', calendarBlockSchema);