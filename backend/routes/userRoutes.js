const express = require('express');
const { listUsers, updateUserRole } = require('../controllers/userController');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.use(requireAuth, requireRole('website_admin'));
router.get('/', listUsers);
router.patch('/:id/role', updateUserRole);

module.exports = router;