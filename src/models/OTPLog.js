const mongoose = require('mongoose');

const otpLogSchema = new mongoose.Schema({
  request_id: {
    type: mongoose.Schema.ObjectId,
    ref: 'ServiceRequest'
  },
  email: {
    type: String,
    required: true
  },
  otp_code: {
    type: String,
    required: true
  },
  expires_at: {
    type: Date,
    required: true
  },
  is_used: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('OTPLog', otpLogSchema);
