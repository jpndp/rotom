const express = require('express');
const { signup, login, me, updateMe } = require('../controllers/authController');
const requireAuth = require('../middleware/auth');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', requireAuth, me);
router.patch('/me', requireAuth, updateMe);

module.exports = router;