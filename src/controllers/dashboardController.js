const InstallationRequest = require('../models/InstallationRequest');
const User = require('../models/User');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const ServiceRequest = require('../models/ServiceRequest');
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
    } else if (req.user.role === 'retailer') {
      query.retailer_id = req.user.id;
    }

    const totalInstallations = await InstallationRequest.countDocuments(query);
    const pendingJobs = await InstallationRequest.countDocuments({ ...query, status: { $ne: 'INSTALLATION_COMPLETED' } });
    const completedJobs = await InstallationRequest.countDocuments({ ...query, status: 'INSTALLATION_COMPLETED' });
    const totalProducts = await Product.countDocuments(
      req.user.role === 'retailer' ? { registered_by: req.user.id } : {}
    );
    const totalCustomers = await Customer.countDocuments(
      req.user.role === 'retailer' ? { created_by: req.user.id } : {}
    );
    const repairRequests = await ServiceRequest.countDocuments(
      req.user.role === 'retailer' ? { retailer_id: req.user.id, request_type: 'repair' } : { request_type: 'repair' }
    );
    
    let activeEngineersCount = 0;
    if (req.user.role === 'super_admin') {
      activeEngineersCount = await User.countDocuments({ role: 'engineer', is_active: true });
    } else if (req.user.role === 'service_center') {
      // Assuming engineers have parent_id set to the service center they belong to
      activeEngineersCount = await User.countDocuments({ role: 'engineer', parent_id: req.user.id, is_active: true });
    }

    // Chart Data: Status Breakdown
    const statusBreakdown = await InstallationRequest.aggregate([
      { $match: query },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    // Chart Data: Monthly Installations (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyInstallations = await InstallationRequest.aggregate([
      { $match: { ...query, createdAt: { $gte: sixMonthsAgo } } },
      { $group: { 
          _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } }, 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // Chart Data: Engineer Workload
    const engineerWorkload = await InstallationRequest.aggregate([
      { $match: { ...query, engineer_id: { $exists: true, $ne: null } } },
      { $group: { _id: "$engineer_id", count: { $sum: 1 } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'engineer' } },
      { $unwind: "$engineer" },
      { $project: { name: "$engineer.name", count: 1 } }
    ]);

    successResponse(res, 200, 'Dashboard stats fetched', {
      totalInstallations,
      pendingJobs,
      completedJobs,
      totalProducts,
      totalCustomers,
      repairRequests,
      activeEngineersCount,
      charts: {
        statusBreakdown,
        monthlyInstallations,
        engineerWorkload
      }
    });
  } catch (error) {
    errorResponse(res, 500, 'Server Error', error.message);
  }
};
