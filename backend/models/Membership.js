const { Schema, model } = require('mongoose');

const membershipSchema = new Schema(
  {
    club: { type: Schema.Types.ObjectId, ref: 'Club', required: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'rejected', 'active'], default: 'pending', required: true },
  },
  { timestamps: true }
);

membershipSchema.index({ club: 1, student: 1 }, { unique: true });

module.exports = model('Membership', membershipSchema);
