const Product = require('../models/Product');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { generateBarcode, generateQRCode } = require('../utils/barcodeGenerator');

// @desc    Add new product & generate barcodes
// @route   POST /api/products
// @access  Private (Admin, Retailer)
exports.addProduct = async (req, res) => {
  try {
    const { model_name, serial_number, warranty_period_months, customer_id, brand, invoice_number, purchase_date, customer_ref } = req.body;

    if (!model_name || !serial_number) {
        return errorResponse(res, 400, 'Please provide model name and serial number');
    }

    // Check if product exists
    const productExists = await Product.findOne({ serial_number });
    if (productExists) {
      return errorResponse(res, 400, 'Product with this serial number already exists');
    }

    // Generate unique barcode text (e.g. SN with a prefix)
    const barcodeText = `TV-${serial_number}`;

    // Generate images
    const barcode_image_url = await generateBarcode(barcodeText);
    const qr_code_url = await generateQRCode(barcodeText);

    const product = await Product.create({
      model_name,
      serial_number,
      brand,
      invoice_number,
      purchase_date,
      barcode: barcodeText,
      barcode_image_url,
      qr_code_url,
      warranty_period_months: warranty_period_months || 12,
      customer_id: customer_id || null,
      customer_ref: customer_ref || null,
      registered_by: req.user.id
    });

    successResponse(res, 201, 'Product created successfully', { product });
  } catch (error) {
    errorResponse(res, 500, 'Server Error', error.message);
  }
};

// @desc    Get all products
// @route   GET /api/products
// @access  Private
exports.getProducts = async (req, res) => {
  try {
    // Role based filtering logic
    let query = {};
    if (req.user.role === 'retailer') {
      query.registered_by = req.user.id;
    } else if (req.user.role === 'customer') {
      const Customer = require('../models/Customer');
      const customerProfile = await Customer.findOne({ user_id: req.user.id });
      
      // Match either the old User-based customer_id or the new Customer-profile-based customer_ref
      query.$or = [
        { customer_id: req.user.id },
        { customer_ref: customerProfile ? customerProfile._id : null }
      ];
    }

    // Search
    if (req.query.search) {
      query.$or = [
        { model_name: { $regex: req.query.search, $options: 'i' } },
        { serial_number: { $regex: req.query.search, $options: 'i' } },
        { barcode: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const products = await Product.find(query)
        .populate('customer_id', 'name email phone')
        .populate('customer_ref', 'name email phone')
        .populate('registered_by', 'name role')
        .skip(skip)
        .limit(limit)
        .sort('-createdAt');
        
    const total = await Product.countDocuments(query);

    successResponse(res, 200, 'Products fetched successfully', { 
      products,
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

// @desc    Assign customer ownership
// @route   PATCH /api/products/:id/assign-customer
// @access  Private (Retailer, Admin)
exports.assignCustomer = async (req, res) => {
  try {
    const { customer_id } = req.body;
    
    if (!customer_id) {
        return errorResponse(res, 400, 'Please provide customer ID');
    }

    let product = await Product.findById(req.params.id);
    if (!product) {
      return errorResponse(res, 404, 'Product not found');
    }

    product.customer_id = customer_id;
    await product.save();

    successResponse(res, 200, 'Customer assigned to product successfully', { product });
  } catch (error) {
    errorResponse(res, 500, 'Server Error', error.message);
  }
};
