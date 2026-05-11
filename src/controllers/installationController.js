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

    // Search
    if (req.query.search) {
      query.ticket_number = { $regex: req.query.search, $options: 'i' };
    }
    
    // Status Filter
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const requests = await InstallationRequest.find(query)
      .populate('customer_id', 'name email phone')
      .populate('product_id', 'model_name serial_number barcode')
      .populate('engineer_id', 'name')
      .populate('service_center_id', 'name')
      .skip(skip)
      .limit(limit)
      .sort('-createdAt');

    const total = await InstallationRequest.countDocuments(query);

    successResponse(res, 200, 'Requests fetched successfully', { 
      requests,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
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

    // Ensure we have the Customer profile ID, not the User ID
    const Customer = require('../models/Customer');
    let customer = await Customer.findById(customer_id);
    let finalCustomerId = customer_id;

    if (!customer) {
      // Check if the provided ID is a User ID
      customer = await Customer.findOne({ user_id: customer_id });
      if (customer) {
        finalCustomerId = customer._id;
      } else {
        return errorResponse(res, 404, 'Customer profile not found. Please ensure the customer is registered.');
      }
    }

    // Generate Ticket Number
    const ticket_number = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;

    const request = await InstallationRequest.create({
      ticket_number,
      retailer_id: req.user.id,
      customer_id: finalCustomerId,
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
    const { engineer_id, assigned_engineer } = req.body;
    const engineerToAssign = engineer_id || assigned_engineer;

    let request = await InstallationRequest.findById(req.params.id);
    if (!request) {
      return errorResponse(res, 404, 'Installation request not found');
    }

    request.engineer_id = engineerToAssign;
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

    // Allow completion from OTP_VERIFIED (normal flow) or OTP_SENT (edge cases)
    const allowedStatuses = ['OTP_VERIFIED', 'OTP_SENT'];
    if (!allowedStatuses.includes(request.status)) {
      return errorResponse(res, 400, `Cannot complete: ticket is in '${request.status}' status. OTP must be verified first.`);
    }

    if (!req.file) {
      return errorResponse(res, 400, 'Please upload an installation proof image');
    }

    // Convert buffer to base64 for ImageKit SDK v7
    const base64File = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype; // e.g. image/jpeg
    const dataUri = `data:${mimeType};base64,${base64File}`;

    const uploadResponse = await imagekit.files.upload({
      file: dataUri,
      fileName: `proof_${req.params.id}_${Date.now()}.jpg`,
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
