const OTPLog = require('../models/OTPLog');
const InstallationRequest = require('../models/InstallationRequest');
const ServiceRequest = require('../models/ServiceRequest');
const sendEmail = require('../services/emailService');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const bcrypt = require('bcryptjs');

// @desc    Send OTP to customer
// @route   POST /api/otp/send
// @access  Private (Engineer)
exports.sendOTP = async (req, res) => {
  try {
    const { request_id } = req.body;

    let request = await InstallationRequest.findById(request_id).populate('customer_id');
    let requestTypeStr = 'Installation';
    
    if (!request) {
      request = await ServiceRequest.findById(request_id).populate('customer_id');
      if (request) requestTypeStr = request.request_type === 'repair' ? 'Repair' : 'Service';
    }

    if (!request) {
      return errorResponse(res, 404, 'Service or installation request not found');
    }

    if (!request.customer_id || !request.customer_id.email) {
        return errorResponse(res, 400, 'Customer email is required for OTP verification');
    }

    const customerEmail = request.customer_id.email;

    // Generate 4 digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    
    // Hash OTP before saving
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    // Expire in 5 minutes
    const expires_at = new Date(Date.now() + 5 * 60000);

    await OTPLog.create({
      request_id,
      email: customerEmail,
      otp_code: hashedOtp,
      expires_at
    });

    // Send Email
    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #2563eb; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">Service Verification</h2>
        </div>
        <div style="padding: 30px; background-color: #f8fafc;">
          <p style="font-size: 16px; color: #334155;">Hello,</p>
          <p style="font-size: 16px; color: #334155;">Your ${requestTypeStr} Verification OTP code is:</p>
          <div style="margin: 30px 0; text-align: center;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b; background-color: white; padding: 15px 30px; border-radius: 6px; border: 1px solid #cbd5e1;">${otp}</span>
          </div>
          <p style="font-size: 14px; color: #ef4444; text-align: center; font-weight: 500;">
            This OTP is valid for 5 minutes. Do not share it with anyone.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">
            Ticket Number: ${request.ticket_number}<br/>
            &copy; ${new Date().getFullYear()} Service Lifecycle Management System
          </p>
        </div>
      </div>
    `;

    await sendEmail({
      email: customerEmail,
      subject: `${requestTypeStr} Verification OTP`,
      message: `Your OTP is: ${otp}`,
      html: htmlTemplate
    });

    // Update status
    request.status = 'OTP_SENT';
    request.timeline.push({ status: 'OTP_SENT', note: 'OTP sent to customer email' });
    await request.save();

    // Mask email for response
    const emailParts = customerEmail.split('@');
    const maskedEmail = emailParts[0].length > 2 
      ? emailParts[0].substring(0, 2) + '*'.repeat(emailParts[0].length - 2) + '@' + emailParts[1]
      : customerEmail;

    successResponse(res, 200, 'OTP sent to customer email successfully', { masked_email: maskedEmail });
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

    // Update request status in whichever collection it belongs
    let request = await InstallationRequest.findById(request_id);
    if (!request) {
      request = await ServiceRequest.findById(request_id);
    }
    
    if (request) {
      request.status = 'OTP_VERIFIED';
      request.timeline.push({ status: 'OTP_VERIFIED', note: 'OTP successfully verified by engineer' });
      await request.save();
    }

    successResponse(res, 200, 'OTP verified successfully');
  } catch (error) {
    errorResponse(res, 500, 'Server Error', error.message);
  }
};

// @desc    Send OTP for customer onboarding
// @route   POST /api/otp/onboarding/send
// @access  Private (Retailer/Admin)
exports.sendOnboardingOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return errorResponse(res, 400, 'Email is required');

    // Generate 4 digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);
    const expires_at = new Date(Date.now() + 10 * 60000); // 10 minutes

    await OTPLog.create({ email, otp_code: hashedOtp, expires_at });

    await sendEmail({
      email,
      subject: 'Email Verification OTP - Innoven Support',
      message: `Your verification OTP is: ${otp}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #2563eb;">Email Verification</h2>
          <p>Please use the following OTP to verify your email and continue with the service request:</p>
          <div style="font-size: 24px; font-weight: bold; padding: 10px; background: #f3f4f6; text-align: center; border-radius: 5px; letter-spacing: 4px;">
            ${otp}
          </div>
          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">This OTP is valid for 10 minutes.</p>
        </div>
      `
    });

    successResponse(res, 200, 'Verification OTP sent to email');
  } catch (error) {
    errorResponse(res, 500, 'Server Error', error.message);
  }
};

// @desc    Verify OTP for onboarding
// @route   POST /api/otp/onboarding/verify
// @access  Private (Retailer/Admin)
exports.verifyOnboardingOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return errorResponse(res, 400, 'Email and OTP are required');

    const otpLog = await OTPLog.findOne({ email, is_used: false }).sort({ createdAt: -1 });

    if (!otpLog || new Date() > otpLog.expires_at) {
      return errorResponse(res, 400, 'OTP expired or not found');
    }

    const isMatch = await bcrypt.compare(otp.toString(), otpLog.otp_code);
    if (!isMatch) return errorResponse(res, 400, 'Invalid OTP');

    otpLog.is_used = true;
    await otpLog.save();

    successResponse(res, 200, 'Email verified successfully');
  } catch (error) {
    errorResponse(res, 500, 'Server Error', error.message);
  }
};

