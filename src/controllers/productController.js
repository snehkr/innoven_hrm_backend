const Product = require('../models/Product');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { generateBarcode, generateQRCode } = require('../utils/barcodeGenerator');

// @desc    Add new product & generate barcodes
// @route   POST /api/products
// @access  Private (Admin, Retailer)
exports.addProduct = async (req, res) => {
  try {
    const { model_name, serial_number, warranty_period_months, customer_id } = req.body;

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
      barcode: barcodeText,
      barcode_image_url,
      qr_code_url,
      warranty_period_months: warranty_period_months || 12,
      customer_id: customer_id || null,
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
      query.customer_id = req.user.id;
    }

    const products = await Product.find(query)
        .populate('customer_id', 'name email phone')
        .populate('registered_by', 'name role');
        
    successResponse(res, 200, 'Products fetched successfully', { products });
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
