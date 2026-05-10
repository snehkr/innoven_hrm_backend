const InstallationRequest = require('../models/InstallationRequest');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// @desc    Get Dashboard Analytics
// @route   GET /api/dashboard
// @access  Private (Super Admin, Service Center)
exports.getDashboardStats = async (req, res) => {
  try {
    let query = {};
    
    // If it's a service center, only get their stats
    if (req.user.role === 'service_center') {
      query.service_center_id = req.user.id;
    }

    const totalInstallations = await InstallationRequest.countDocuments(query);
    const pendingJobs = await InstallationRequest.countDocuments({ ...query, status: { $ne: 'INSTALLATION_COMPLETED' } });
    const completedJobs = await InstallationRequest.countDocuments({ ...query, status: 'INSTALLATION_COMPLETED' });
    
    let activeEngineersCount = 0;
    if (req.user.role === 'super_admin') {
      activeEngineersCount = await User.countDocuments({ role: 'engineer', is_active: true });
    } else if (req.user.role === 'service_center') {
      // Assuming engineers have parent_id set to the service center they belong to
      activeEngineersCount = await User.countDocuments({ role: 'engineer', parent_id: req.user.id, is_active: true });
    }

    successResponse(res, 200, 'Dashboard stats fetched', {
      totalInstallations,
      pendingJobs,
      completedJobs,
      activeEngineersCount
    });
  } catch (error) {
    errorResponse(res, 500, 'Server Error', error.message);
  }
};
