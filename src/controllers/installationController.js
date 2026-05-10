const InstallationRequest = require('../models/InstallationRequest');
const Product = require('../models/Product');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const imagekit = require('../utils/imagekit');

// @desc    Get all installation requests
// @route   GET /api/installations
// @access  Private (Admin, Retailer, Service Center)
exports.getAllRequests = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'retailer') {
      query.retailer_id = req.user.id;
    } else if (req.user.role === 'service_center') {
      query.service_center_id = req.user.id;
    }

    const requests = await InstallationRequest.find(query)
      .populate('customer_id', 'name email phone')
      .populate('product_id', 'model_name serial_number barcode')
      .populate('engineer_id', 'name')
      .populate('service_center_id', 'name')
      .sort('-createdAt');

    successResponse(res, 200, 'Requests fetched successfully', { requests });
  } catch (error) {
    errorResponse(res, 500, 'Server Error', error.message);
  }
};

// @desc    Create an installation request
// @route   POST /api/installations
// @access  Private (Retailer)
exports.createRequest = async (req, res) => {
  try {
    const { customer_id, product_id } = req.body;

    const product = await Product.findById(product_id);
    if (!product) {
      return errorResponse(res, 404, 'Product not found');
    }

    // Generate Ticket Number
    const ticket_number = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;

    const request = await InstallationRequest.create({
      ticket_number,
      retailer_id: req.user.id,
      customer_id,
      product_id,
      timeline: [{ status: 'PENDING', note: 'Request created by retailer' }]
    });

    successResponse(res, 201, 'Installation request created successfully', { request });
  } catch (error) {
    errorResponse(res, 500, 'Server Error', error.message);
  }
};

// @desc    Assign service center
// @route   PATCH /api/installations/:id/assign-service-center
// @access  Private (Super Admin)
exports.assignServiceCenter = async (req, res) => {
  try {
    const { service_center_id } = req.body;

    let request = await InstallationRequest.findById(req.params.id);
    if (!request) {
      return errorResponse(res, 404, 'Installation request not found');
    }

    request.service_center_id = service_center_id;
    request.status = 'SERVICE_CENTER_ASSIGNED';
    request.timeline.push({ status: 'SERVICE_CENTER_ASSIGNED', note: 'Service center assigned by Admin' });
    
    await request.save();

    successResponse(res, 200, 'Service center assigned', { request });
  } catch (error) {
    errorResponse(res, 500, 'Server Error', error.message);
  }
};

// @desc    Assign engineer
// @route   PATCH /api/installations/:id/assign-engineer
// @access  Private (Service Center)
exports.assignEngineer = async (req, res) => {
  try {
    const { engineer_id } = req.body;

    let request = await InstallationRequest.findById(req.params.id);
    if (!request) {
      return errorResponse(res, 404, 'Installation request not found');
    }

    request.engineer_id = engineer_id;
    request.status = 'ENGINEER_ASSIGNED';
    request.timeline.push({ status: 'ENGINEER_ASSIGNED', note: 'Engineer assigned by Service Center' });
    
    await request.save();

    successResponse(res, 200, 'Engineer assigned', { request });
  } catch (error) {
    errorResponse(res, 500, 'Server Error', error.message);
  }
};

// @desc    Get assigned jobs for engineer
// @route   GET /api/installations/assigned
// @access  Private (Engineer)
exports.getAssignedJobs = async (req, res) => {
  try {
    const jobs = await InstallationRequest.find({ engineer_id: req.user.id })
      .populate('customer_id', 'name phone address')
      .populate('product_id', 'model_name serial_number barcode');

    successResponse(res, 200, 'Assigned jobs fetched', { jobs });
  } catch (error) {
    errorResponse(res, 500, 'Server Error', error.message);
  }
};

// @desc    Complete installation & upload proof
// @route   POST /api/installations/:id/complete
// @access  Private (Engineer)
exports.completeInstallation = async (req, res) => {
  try {
    let request = await InstallationRequest.findById(req.params.id);
    if (!request) {
      return errorResponse(res, 404, 'Installation request not found');
    }

    if (request.status !== 'OTP_VERIFIED') {
      return errorResponse(res, 400, 'OTP must be verified before completing installation');
    }

    if (!req.file) {
      return errorResponse(res, 400, 'Please upload an installation proof image');
    }

    const uploadResponse = await imagekit.upload({
      file: req.file.buffer,
      fileName: req.file.originalname,
      folder: '/installations'
    });

    request.installation_proof_url = uploadResponse.url;
    request.status = 'INSTALLATION_COMPLETED';
    request.timeline.push({ status: 'INSTALLATION_COMPLETED', note: 'Installation completed by engineer' });
    
    await request.save();

    successResponse(res, 200, 'Installation marked as completed', { request });
  } catch (error) {
    errorResponse(res, 500, 'Server Error', error.message);
  }
};
