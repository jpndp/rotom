const express = require('express');
const { listBlocks, createBlock, deleteBlock, getSuggestions } = require('../controllers/scheduleController');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.get('/suggestions', requireAuth, requireRole('club_admin', 'website_admin'), getSuggestions);
// Public read: the college calendar (holidays, midsem periods) is not sensitive. Writes stay website_admin-only.
router.get('/blocks', listBlocks);
router.post('/blocks', requireAuth, requireRole('website_admin'), createBlock);
router.delete('/blocks/:id', requireAuth, requireRole('website_admin'), deleteBlock);

module.exports = router;