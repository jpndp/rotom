const { Schema, model } = require('mongoose');

const announcementSchema = new Schema(
  {
    club: { type: Schema.Types.ObjectId, ref: 'Club', default: null },
    postedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    isPinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = model('Announcement', announcementSchema);
