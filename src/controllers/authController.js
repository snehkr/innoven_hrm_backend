const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const jwt = require('jsonwebtoken');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public (or Admin depending on role)
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone, address, parent_id } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return errorResponse(res, 400, 'User already exists with that email');
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'customer',
      phone,
      address,
      parent_id
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    errorResponse(res, 500, 'Server Error', error.message);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return errorResponse(res, 400, 'Please provide an email and password');
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return errorResponse(res, 401, 'Invalid credentials');
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return errorResponse(res, 401, 'Invalid credentials');
    }

    if (!user.is_active) {
      return errorResponse(res, 401, 'Your account is deactivated');
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    errorResponse(res, 500, 'Server Error', error.message);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    successResponse(res, 200, 'User fetched successfully', { user });
  } catch (error) {
    errorResponse(res, 500, 'Server Error', error.message);
  }
};

// Helper function to get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = generateToken(user._id);

  // Remove password from output
  user.password = undefined;

  successResponse(res, statusCode, 'Authentication successful', {
    user,
    token
  });
};

// @desc    Get users (filtered by role)
// @route   GET /api/auth/users
// @access  Private (Admin/Service Center)
exports.getUsers = async (req, res) => {
  try {
    let query = {};
    if (req.query.role) {
      query.role = req.query.role;
    }
    
    // Service centers can only see their own engineers
    if (req.user.role === 'service_center') {
      query.parent_id = req.user.id;
    }

    const users = await User.find(query).select('-password');
    successResponse(res, 200, 'Users fetched successfully', { users });
  } catch (error) {
    errorResponse(res, 500, 'Server Error', error.message);
  }
};
