const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');
const seedAdmin = require('./config/seedAdmin');

// Load environment variables
dotenv.config();

// Connect to Database, then seed default admin
connectDB().then(() => {
  seedAdmin();
});

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/surveys', require('./routes/surveyRoutes'));

// Serve Frontend static assets
app.use(express.static(path.join(__dirname, '../frontend')));

// Fallback for HTML routing
app.get('*', (req, res, next) => {
  if (req.accepts('html') && !req.url.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  } else {
    next();
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`🌐 Open http://localhost:${PORT} in your browser`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});
