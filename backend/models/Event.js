const { Schema, model } = require('mongoose');

const eventSchema = new Schema(
  {
    club: { type: Schema.Types.ObjectId, ref: 'Club', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: { type: String },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String },
    venue: { type: String, required: true },
    organizers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isRemoved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

eventSchema.index({ club: 1, date: 1 });

module.exports = model('Event', eventSchema);