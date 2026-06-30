const express = require('express');
const router = express.Router();
const {
  createSurvey,
  getSurveys,
  getSurveyById,
  getCitizenHistory,
  updateSurvey,
  deleteSurvey,
  getStats,
  getPublicStats
} = require('../controllers/surveyController');
const { protect } = require('../controllers/authController');

// Public route to submit survey
router.post('/', createSurvey);

// Public route to get landing page stats
router.get('/public-stats', getPublicStats);

// Get historical surveys for a specific citizen (Follow-up tracking)
router.get('/citizen/:citizenId/history', getCitizenHistory);

// Protected routes (Admin-only stats)
router.get('/stats', protect, getStats);

// Public route to get a single survey report by ID
router.get('/:id', getSurveyById);

// Protected routes (Admin-only list, update, delete)
router.get('/', protect, getSurveys);
router.put('/:id', protect, updateSurvey);
router.delete('/:id', protect, deleteSurvey);

module.exports = router;
