const express = require('express');
const router = express.Router();
const { getPriorityList, getCampRecommendations, getVillageActionPlan } = require('../controllers/planController');
const { protect } = require('../controllers/authController');

// All plan routes require authentication
router.get('/priority-list', protect, getPriorityList);
router.get('/camp-recommendations', protect, getCampRecommendations);
router.get('/action-plan/:village', protect, getVillageActionPlan);

module.exports = router;
