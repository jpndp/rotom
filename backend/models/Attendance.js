const { Schema, model } = require('mongoose');

const attendanceSchema = new Schema(
  {
    registration: { type: Schema.Types.ObjectId, ref: 'Registration', required: true, unique: true },
    attended: { type: Boolean, default: false },
    markedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = model('Attendance', attendanceSchema);