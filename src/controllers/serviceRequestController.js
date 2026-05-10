const ServiceRequest = require('../models/ServiceRequest');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// @desc    Create service request
// @route   POST /api/service-requests
// @access  Private (Retailer, Admin)
exports.createServiceRequest = async (req, res) => {
  try {
    const { customer_id, product_id, request_type, issue_description, issue_type, urgency } = req.body;

    if (!customer_id || !product_id || !request_type) {
      return errorResponse(res, 400, 'customer_id, product_id and request_type are required');
    }

    const [customer, product] = await Promise.all([
      Customer.findById(customer_id),
      Product.findById(product_id)
    ]);

    if (!customer) return errorResponse(res, 404, 'Customer not found');
    if (!product) return errorResponse(res, 404, 'Product not found');

    const ticket_number = `SR-${Math.floor(100000 + Math.random() * 900000)}`;

    const serviceRequest = await ServiceRequest.create({
      ticket_number,
      request_type,
      customer_id,
      product_id,
      retailer_id: req.user.id,
      issue_description,
      issue_type,
      urgency: urgency || 'medium',
      timeline: [{ status: 'PENDING', note: `${request_type} request created by retailer` }]
    });

    successResponse(res, 201, 'Service request created successfully', { serviceRequest });
  } catch (error) {
    errorResponse(res, 500, 'Server Error', error.message);
  }
};

// @desc    Get all service requests
// @route   GET /api/service-requests
// @access  Private
exports.getServiceRequests = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'retailer') {
      query.retailer_id = req.user.id;
    } else if (req.user.role === 'service_center') {
      query.assigned_service_center = req.user.id;
    } else if (req.user.role === 'engineer') {
      query.assigned_engineer = req.user.id;
    }

    if (req.query.type) query.request_type = req.query.type;
    if (req.query.status) query.status = req.query.status;
    if (req.query.search) {
      query.ticket_number = { $regex: req.query.search, $options: 'i' };
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      ServiceRequest.find(query)
        .populate('customer_id', 'name phone city')
        .populate('product_id', 'model_name serial_number brand')
        .populate('assigned_engineer', 'name')
        .populate('assigned_service_center', 'name')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit),
      ServiceRequest.countDocuments(query)
    ]);

    successResponse(res, 200, 'Service requests fetched', {
      requests,
      pagination: { total, page, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    errorResponse(res, 500, 'Server Error', error.message);
  }
};

// @desc    Update service request status
// @route   PATCH /api/service-requests/:id/status
// @access  Private (Admin, Service Center)
exports.updateStatus = async (req, res) => {
  try {
    const { status, note, assigned_engineer, assigned_service_center } = req.body;

    const sr = await ServiceRequest.findById(req.params.id);
    if (!sr) return errorResponse(res, 404, 'Service request not found');

    if (status) sr.status = status;
    if (assigned_engineer) sr.assigned_engineer = assigned_engineer;
    if (assigned_service_center) sr.assigned_service_center = assigned_service_center;

    sr.timeline.push({ status: status || sr.status, note: note || 'Status updated' });
    await sr.save();

    successResponse(res, 200, 'Status updated', { serviceRequest: sr });
  } catch (error) {
    errorResponse(res, 500, 'Server Error', error.message);
  }
};
