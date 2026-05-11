const ServiceRequest = require('../models/ServiceRequest');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const User = require('../models/User');
const OTPLog = require('../models/OTPLog');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// @desc    Onboard customer and create service request
// @route   POST /api/service-requests/onboard-request
// @access  Private (Retailer, Admin)
exports.onboardAndCreateRequest = async (req, res) => {
  try {
    const { 
      customer_info, // name, phone, email, address, city, state, pincode
      product_info,  // model_name, serial_number, brand, purchase_date
      request_info   // request_type, issue_description, issue_type, urgency
    } = req.body;

    if (!customer_info?.email || !product_info?.serial_number) {
      return errorResponse(res, 400, 'Customer email and product serial number are required');
    }

    // 1. Verify that email was recently OTP-verified
    const otpVerified = await OTPLog.findOne({ 
      email: customer_info.email, 
      is_used: true 
    }).sort({ updatedAt: -1 });

    if (!otpVerified || (Date.now() - new Date(otpVerified.updatedAt).getTime()) > 30 * 60000) {
      return errorResponse(res, 400, 'Email verification expired or not found. Please verify OTP first.');
    }

    // 2. Handle User (Login Account)
    let user = await User.findOne({ email: customer_info.email });
    if (!user) {
      user = await User.create({
        name: customer_info.name,
        email: customer_info.email,
        phone: customer_info.phone,
        password: 'pass123', // Default password
        role: 'customer'
      });
    }

    // 3. Handle Customer Profile
    let customer = await Customer.findOne({ email: customer_info.email });
    if (!customer) {
      customer = await Customer.create({
        ...customer_info,
        user_id: user._id,
        created_by: req.user.id
      });
    } else {
      // Ensure user_id is linked if it wasn't
      if (!customer.user_id) {
        customer.user_id = user._id;
        await customer.save();
      }
    }

    // 4. Handle Product
    let product = await Product.findOne({ serial_number: product_info.serial_number });
    if (!product) {
      product = await Product.create({
        ...product_info,
        customer_id: user._id,
        customer_ref: customer._id,
        registered_by: req.user.id
      });
    } else {
      // Update product owner if needed
      product.customer_id = user._id;
      product.customer_ref = customer._id;
      await product.save();
    }

    // 5. Create Service Request
    const ticket_number = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
    const serviceRequest = await ServiceRequest.create({
      ticket_number,
      ...request_info,
      customer_id: customer._id,
      product_id: product._id,
      retailer_id: req.user.id,
      timeline: [{ status: 'PENDING', note: `${request_info.request_type} request created via onboarding` }]
    });

    successResponse(res, 201, 'Onboarding and service request completed successfully', { 
      serviceRequest,
      credentials: {
        email: customer_info.email,
        password: 'pass123'
      }
    });
  } catch (error) {
    errorResponse(res, 500, 'Server Error', error.message);
  }
};


// @desc    Create service request
// @route   POST /api/service-requests
// @access  Private (Retailer, Admin)
exports.createServiceRequest = async (req, res) => {
  try {
    let { customer_id, product_id, request_type, issue_description, issue_type, urgency } = req.body;

    // If customer is creating the request, they don't provide customer_id in body
    if (req.user.role === 'customer') {
      const customerProfile = await Customer.findOne({ user_id: req.user.id });
      if (!customerProfile) return errorResponse(res, 404, 'Customer profile not found');
      customer_id = customerProfile._id;
    }

    if (!customer_id || !product_id || !request_type) {
      return errorResponse(res, 400, 'customer_id, product_id and request_type are required');
    }

    const [customer, product] = await Promise.all([
      Customer.findById(customer_id),
      Product.findById(product_id)
    ]);

    if (!customer) return errorResponse(res, 404, 'Customer not found');
    if (!product) return errorResponse(res, 404, 'Product not found');

    const ticket_number = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;

    // Determine retailer_id (if customer, use product's registered_by)
    const finalRetailerId = req.user.role === 'customer' ? product.registered_by : req.user.id;

    const serviceRequest = await ServiceRequest.create({
      ticket_number,
      request_type,
      customer_id,
      product_id,
      retailer_id: finalRetailerId,
      issue_description,
      issue_type,
      urgency: urgency || 'medium',
      timeline: [{ status: 'PENDING', note: `${request_type} request created by ${req.user.role}` }]
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
    } else if (req.user.role === 'customer') {
      const Customer = require('../models/Customer');
      const customerProfile = await Customer.findOne({ user_id: req.user.id });
      if (customerProfile) {
        query.customer_id = customerProfile._id;
      } else {
        query.customer_id = new require('mongoose').Types.ObjectId();
      }
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
    const { status, note, assigned_engineer, engineer_id, assigned_service_center, service_center_id } = req.body;

    const sr = await ServiceRequest.findById(req.params.id);
    if (!sr) return errorResponse(res, 404, 'Service request not found');

    if (status) sr.status = status;
    
    // Support both naming conventions for compatibility
    const engineerToAssign = assigned_engineer || engineer_id;
    const scToAssign = assigned_service_center || service_center_id;

    if (engineerToAssign) sr.assigned_engineer = engineerToAssign;
    if (scToAssign) sr.assigned_service_center = scToAssign;

    sr.timeline.push({ status: status || sr.status, note: note || 'Status updated' });
    await sr.save();

    successResponse(res, 200, 'Status updated', { serviceRequest: sr });
  } catch (error) {
    errorResponse(res, 500, 'Server Error', error.message);
  }
};
