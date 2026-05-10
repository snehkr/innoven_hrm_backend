const OTPLog = require('../models/OTPLog');
const InstallationRequest = require('../models/InstallationRequest');
const sendEmail = require('../services/emailService');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const bcrypt = require('bcryptjs');

// @desc    Send OTP to customer
// @route   POST /api/otp/send
// @access  Private (Engineer)
exports.sendOTP = async (req, res) => {
  try {
    const { request_id } = req.body;

    const request = await InstallationRequest.findById(request_id).populate('customer_id');
    if (!request) {
      return errorResponse(res, 404, 'Installation request not found');
    }

    if (!request.customer_id) {
        return errorResponse(res, 400, 'Customer details not found for this request');
    }

    // Generate 4 digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    
    // Hash OTP before saving
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    // Expire in 5 minutes
    const expires_at = new Date(Date.now() + 5 * 60000);

    await OTPLog.create({
      request_id,
      email: request.customer_id.email,
      otp_code: hashedOtp,
      expires_at
    });

    // Send Email
    const message = `Your TV Installation Verification OTP is: ${otp}. It is valid for 5 minutes.`;
    await sendEmail({
      email: request.customer_id.email,
      subject: 'Installation Verification OTP',
      message
    });

    // Update status
    request.status = 'OTP_SENT';
    request.timeline.push({ status: 'OTP_SENT', note: 'OTP sent to customer' });
    await request.save();

    successResponse(res, 200, 'OTP sent to customer email successfully');
  } catch (error) {
    errorResponse(res, 500, 'Server Error', error.message);
  }
};

// @desc    Verify OTP
// @route   POST /api/otp/verify
// @access  Private (Engineer)
exports.verifyOTP = async (req, res) => {
  try {
    const { request_id, otp } = req.body;

    const otpLog = await OTPLog.findOne({ request_id, is_used: false }).sort({ createdAt: -1 });

    if (!otpLog) {
      return errorResponse(res, 400, 'No active OTP found or OTP already used');
    }

    if (new Date() > otpLog.expires_at) {
      return errorResponse(res, 400, 'OTP has expired');
    }

    const isMatch = await bcrypt.compare(otp.toString(), otpLog.otp_code);

    if (!isMatch) {
      return errorResponse(res, 400, 'Invalid OTP');
    }

    // Mark as used
    otpLog.is_used = true;
    await otpLog.save();

    // Update request status
    const request = await InstallationRequest.findById(request_id);
    request.status = 'OTP_VERIFIED';
    request.timeline.push({ status: 'OTP_VERIFIED', note: 'OTP successfully verified by engineer' });
    await request.save();

    successResponse(res, 200, 'OTP verified successfully');
  } catch (error) {
    errorResponse(res, 500, 'Server Error', error.message);
  }
};
