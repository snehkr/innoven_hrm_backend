const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/responseHandler');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return errorResponse(res, 401, 'Not authorized to access this route');
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return errorResponse(res, 401, 'User not found with this token');
    }

    if (!req.user.is_active) {
      return errorResponse(res, 401, 'User account is deactivated');
    }

    next();
  } catch (err) {
    return errorResponse(res, 401, 'Not authorized to access this route');
  }
};

module.exports = { protect };
