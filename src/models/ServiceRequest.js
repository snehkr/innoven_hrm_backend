const mongoose = require('mongoose');

const serviceRequestSchema = new mongoose.Schema({
  ticket_number: {
    type: String,
    required: true,
    unique: true
  },
  request_type: {
    type: String,
    enum: ['installation', 'repair', 'service_visit'],
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
  retailer_id: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  // Repair/service fields
  issue_description: {
    type: String
  },
  issue_type: {
    type: String,
    enum: ['no_power', 'display_issue', 'sound_issue', 'remote_issue', 'connectivity', 'physical_damage', 'other']
  },
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  // Assignment
  assigned_service_center: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  assigned_engineer: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: [
      'PENDING',
      'SERVICE_CENTER_ASSIGNED',
      'ENGINEER_ASSIGNED',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED'
    ],
    default: 'PENDING'
  },
  timeline: [{
    status: String,
    note: String,
    timestamp: { type: Date, default: Date.now }
  }],
  completion_notes: String,
  proof_image_url: String
}, { timestamps: true });

serviceRequestSchema.index({ retailer_id: 1, createdAt: -1 });
serviceRequestSchema.index({ status: 1, request_type: 1 });
serviceRequestSchema.index({ assigned_engineer: 1, status: 1 });

module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);
