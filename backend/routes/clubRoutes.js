const express = require('express');
const { listClubs, getClub, getClubOrgChart, createClub, updateClub, deleteClub } = require('../controllers/clubController');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const {
  getMyMembership,
  requestMembership,
  listClubMemberships,
  updateClubMembership,
  removeClubMembership,
} = require('../controllers/membershipController');

const router = express.Router();

router.get('/', listClubs);
router.get('/:id', getClub);
router.get('/:id/org-chart', requireAuth, getClubOrgChart);
router.get('/:id/membership', requireAuth, getMyMembership);
router.post('/:id/membership', requireAuth, requestMembership);
router.get('/:id/memberships', requireAuth, requireRole('club_admin', 'website_admin'), listClubMemberships);
router.patch('/:id/memberships/:membershipId', requireAuth, requireRole('club_admin', 'website_admin'), updateClubMembership);
router.delete('/:id/memberships/:membershipId', requireAuth, requireRole('club_admin', 'website_admin'), removeClubMembership);
router.post('/', requireAuth, requireRole('website_admin'), createClub);
router.patch('/:id', requireAuth, requireRole('club_admin', 'website_admin'), updateClub);
router.delete('/:id', requireAuth, requireRole('website_admin'), deleteClub);

module.exports = router;
