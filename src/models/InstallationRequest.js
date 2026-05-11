const mongoose = require('mongoose');

const installationRequestSchema = new mongoose.Schema({
  ticket_number: {
    type: String,
    required: true,
    unique: true
  },
  retailer_id: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  customer_id: {
    type: mongoose.Schema.ObjectId,
    ref: 'Customer',
    required: true
  },
  product_id: {
    type: mongoose.Schema.ObjectId,
    ref: 'Product',
    required: true
  },
  service_center_id: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  engineer_id: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: [
      'PENDING',
      'SERVICE_CENTER_ASSIGNED',
      'ENGINEER_ASSIGNED',
      'ENGINEER_VISITING',
      'BARCODE_VERIFIED',
      'OTP_SENT',
      'OTP_VERIFIED',
      'INSTALLATION_COMPLETED'
    ],
    default: 'PENDING'
  },
  timeline: [{
    status: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: String
  }],
  installation_proof_url: {
    type: String
  }
}, { timestamps: true });

// Compound indexes for optimized querying
installationRequestSchema.index({ status: 1, engineer_id: 1 });
installationRequestSchema.index({ retailer_id: 1, createdAt: -1 });
installationRequestSchema.index({ service_center_id: 1, status: 1 });

module.exports = mongoose.model('InstallationRequest', installationRequestSchema);
