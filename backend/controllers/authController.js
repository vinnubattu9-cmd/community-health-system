const jwt = require('jsonwebtoken');
const dbManager = require('../config/dbManager');
const bcrypt = require('bcryptjs');

// Helper to match password (supports both Mongo model methods and raw Firestore objects)
const matchPassword = async (user, enteredPassword) => {
  // If it's a Mongoose document, use the model method
  if (typeof user.matchPassword === 'function') {
    return await user.matchPassword(enteredPassword);
  }
  // Otherwise, do a direct bcrypt compare (Firestore)
  return await bcrypt.compare(enteredPassword, user.password);
};

// @desc    User Login (supports roles: ASHA, ANM, PHC, NGO, SACHIVALAYAM)
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username and password'
      });
    }

    // Find user using dbManager
    const user = await dbManager.findUser(username);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Compare password
    const isMatch = await matchPassword(user, password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Create JWT token including role
    const jwtSecret = process.env.JWT_SECRET || 'health_monitoring_system_secret_key_2026';
    const userId = user._id || user.id;
    const token = jwt.sign(
      { id: userId, role: user.role, username: user.username },
      jwtSecret,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      success: true,
      message: 'Authenticated successfully',
      token,
      user: {
        id: userId,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Authentication Error'
    });
  }
};

// Middleware to protect routes (verifies JWT)
exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Authorization token required.'
    });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || 'health_monitoring_system_secret_key_2026';
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token is invalid or has expired. Please log in again.'
    });
  }
};

// Middleware to authorize specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role (${req.user.role || 'unknown'}) is not authorized to access this resource`
      });
    }
    next();
  };
};
