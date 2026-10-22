const mongoose = require('mongoose');
const { CalendarBlock } = require('../models');
const catchAsync = require('../utils/catchAsync');
const { suggestSlots, isIsoDate, earliestDate } = require('../utils/schedule');

async function listBlocks(req, res) {
  res.json({ blocks: await CalendarBlock.find().sort({ startDate: 1 }) });
}

async function createBlock(req, res) {
  const { type, label, startDate, endDate = startDate } = req.body;
  if (!['holiday', 'midsem'].includes(type)) return res.status(400).json({ error: 'type must be holiday or midsem' });
  if (typeof label !== 'string' || !label.trim() || label.length > 100) return res.status(400).json({ error: 'label is required (max 100 characters)' });
  if (!isIsoDate(startDate) || !isIsoDate(endDate) || endDate < startDate) {
    return res.status(400).json({ error: 'startDate and endDate must be valid YYYY-MM-DD, endDate not before startDate' });
  }
  const block = await CalendarBlock.create({ type, label: label.trim(), startDate, endDate });
  res.status(201).json({ block });
}

async function deleteBlock(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid block id' });
  const block = await CalendarBlock.findByIdAndDelete(req.params.id);
  if (!block) return res.status(404).json({ error: 'Block not found' });
  res.json({ success: true });
}

async function getSuggestions(req, res) {
  const earliest = earliestDate();
  const { from = earliest } = req.query;
  const count = Number(req.query.count ?? 5);
  if (!isIsoDate(from)) return res.status(400).json({ error: 'from must be a valid YYYY-MM-DD date' });
  if (!Number.isInteger(count) || count < 1 || count > 20) return res.status(400).json({ error: 'count must be an integer from 1 to 20' });  
  const start = from < earliest ? earliest : from;
  const blocks = await CalendarBlock.find({ endDate: { $gte: start } });
  res.json({ suggestions: suggestSlots(blocks, { from: start, count }) });
}

module.exports = {
  listBlocks: catchAsync(listBlocks),
  createBlock: catchAsync(createBlock),
  deleteBlock: catchAsync(deleteBlock),
  getSuggestions: catchAsync(getSuggestions),
};