const express = require('express');
const { myRegistrations } = require('../controllers/registrationController');
const requireAuth = require('../middleware/auth');

const router = express.Router();

router.get('/registrations', requireAuth, myRegistrations);

module.exports = router;