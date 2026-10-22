const express = require('express');
const { listEvents, getEvent, createEvent, updateEvent, deleteEvent } = require('../controllers/eventController');
const { registerForEvent, cancelRegistration, listEventRegistrations } = require('../controllers/registrationController');
const { listAttendance, markAttendance } = require('../controllers/attendanceController');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.get('/', listEvents);
router.get('/:id', getEvent);
router.post('/', requireAuth, requireRole('club_admin', 'website_admin'), createEvent);
router.patch('/:id', requireAuth, requireRole('club_admin', 'website_admin'), updateEvent);
router.delete('/:id', requireAuth, requireRole('club_admin', 'website_admin'), deleteEvent);

router.post('/:id/register', requireAuth, registerForEvent);
router.delete('/:id/register', requireAuth, cancelRegistration);
router.get('/:id/registrations', requireAuth, requireRole('club_admin', 'website_admin'), listEventRegistrations);

router.get('/:id/attendance', requireAuth, requireRole('club_admin', 'website_admin'), listAttendance);
router.patch('/:id/attendance', requireAuth, requireRole('club_admin', 'website_admin'), markAttendance);

module.exports = router;