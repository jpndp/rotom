const { Schema, model } = require('mongoose');

const orgChartEntrySchema = new Schema(
  {
        key: { type: String },
    position: { type: String, required: true },
    member: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String },
    reportsTo: { type: String, default: null }, // key of the entry this one reports to; null = top level
  },
  { _id: false }
);

const clubSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
    category: { type: String, required: true },
    logoUrl: {
  type: String,
  default: '',
  trim: true,
  maxlength: 2048,
  match: [/^(https:\/\/\S+)?$/i, 'logoUrl must be an https URL'],
},
    orgChart: [orgChartEntrySchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = model('Club', clubSchema);