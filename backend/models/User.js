const { Schema, model } = require('mongoose');

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['student', 'club_admin', 'website_admin'], default: 'student', required: true },
    clubs: [{ type: Schema.Types.ObjectId, ref: 'Club' }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = model('User', userSchema);