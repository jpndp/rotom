const express = require('express');
const { listAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } = require('../controllers/announcementController');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.get('/', listAnnouncements);
router.post('/', requireAuth, requireRole('club_admin', 'website_admin'), createAnnouncement);
router.patch('/:id', requireAuth, requireRole('club_admin', 'website_admin'), updateAnnouncement);
router.delete('/:id', requireAuth, requireRole('club_admin', 'website_admin'), deleteAnnouncement);

module.exports = router;