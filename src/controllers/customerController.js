const Customer = require('../models/Customer');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// @desc    Create customer
// @route   POST /api/customers
// @access  Private (Retailer, Admin)
exports.createCustomer = async (req, res) => {
  try {
    const { name, phone, alternate_phone, email, address, city, state, pincode } = req.body;

    if (!name || !phone || !email) {
      return errorResponse(res, 400, 'Customer name, phone, and email are required');
    }

    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return errorResponse(res, 400, 'Please provide a valid email format');
    }

    const existing = await Customer.findOne({ 
      $or: [{ phone }, { email }], 
      created_by: req.user.id 
    });
    if (existing) {
      return errorResponse(res, 400, 'A customer with this phone number or email already exists in your account');
    }

    // 1. Handle User (Login Account)
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        phone,
        password: 'pass123', // Default password
        role: 'customer'
      });
    }

    // 2. Create Customer Profile linked to user_id
    const customer = await Customer.create({
      name, phone, alternate_phone, email, address, city, state, pincode,
      user_id: user._id,
      created_by: req.user.id
    });

    successResponse(res, 201, 'Customer created successfully', { 
      customer,
      credentials: {
        email,
        password: 'pass123'
      }
    });
  } catch (error) {
    errorResponse(res, 500, 'Server Error', error.message);
  }
};

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
exports.getCustomers = async (req, res) => {
  try {
    let query = {};

    // Retailers see only their customers
    if (req.user.role === 'retailer') {
      query.created_by = req.user.id;
    }

    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { phone: { $regex: req.query.search, $options: 'i' } },
        { city: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      Customer.find(query)
        .populate('created_by', 'name role')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit),
      Customer.countDocuments(query)
    ]);

    successResponse(res, 200, 'Customers fetched successfully', {
      customers,
      pagination: { total, page, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    errorResponse(res, 500, 'Server Error', error.message);
  }
};

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private
exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id).populate('created_by', 'name role');
    if (!customer) return errorResponse(res, 404, 'Customer not found');
    successResponse(res, 200, 'Customer fetched', { customer });
  } catch (error) {
    errorResponse(res, 500, 'Server Error', error.message);
  }
};
