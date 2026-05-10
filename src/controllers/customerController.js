const Customer = require('../models/Customer');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// @desc    Create customer
// @route   POST /api/customers
// @access  Private (Retailer, Admin)
exports.createCustomer = async (req, res) => {
  try {
    const { name, phone, alternate_phone, email, address, city, state, pincode } = req.body;

    if (!name || !phone) {
      return errorResponse(res, 400, 'Customer name and phone are required');
    }

    const existing = await Customer.findOne({ phone, created_by: req.user.id });
    if (existing) {
      return errorResponse(res, 400, 'A customer with this phone number already exists in your account');
    }

    const customer = await Customer.create({
      name, phone, alternate_phone, email, address, city, state, pincode,
      created_by: req.user.id
    });

    successResponse(res, 201, 'Customer created successfully', { customer });
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
