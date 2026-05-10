const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  model_name: {
    type: String,
    required: [true, 'Please add a model name']
  },
  serial_number: {
    type: String,
    required: [true, 'Please add a serial number'],
    unique: true
  },
  barcode: {
    type: String,
    unique: true
  },
  barcode_image_url: {
    type: String
  },
  qr_code_url: {
    type: String
  },
  warranty_period_months: {
    type: Number,
    default: 12
  },
  customer_id: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    default: null
  },
  registered_by: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  brand: {
    type: String,
    trim: true
  },
  invoice_number: {
    type: String,
    trim: true
  },
  purchase_date: {
    type: Date
  },
  // Reference to Customer model (new workflow)
  customer_ref: {
    type: mongoose.Schema.ObjectId,
    ref: 'Customer',
    default: null
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
