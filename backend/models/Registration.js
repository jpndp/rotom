const { Schema, model } = require('mongoose');

const registrationSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    status: { type: String, enum: ['registered', 'cancelled'], default: 'registered' },
  },
  { timestamps: true }
);

registrationSchema.index({ student: 1, event: 1 }, { unique: true });

module.exports = model('Registration', registrationSchema);