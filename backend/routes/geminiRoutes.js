const express = require('express');
const router = express.Router();
const { askChatbot, generateAdvisory } = require('../controllers/geminiController');
const { protect } = require('../controllers/authController');

// Ask Chatbot (requires JWT authentication)
router.post('/chat', protect, askChatbot);

// Generate advisory paragraph based on metrics (public, used on report rendering)
router.post('/advisory', generateAdvisory);

module.exports = router;
