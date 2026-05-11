const express = require('express');
const { sendOTP, verifyOTP, sendOnboardingOTP, verifyOnboardingOTP } = require('../controllers/otpController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(protect);

router.post('/send', authorize('super_admin', 'engineer'), sendOTP);
router.post('/verify', authorize('super_admin', 'engineer'), verifyOTP);
router.post('/onboarding/send', authorize('super_admin', 'retailer'), sendOnboardingOTP);
router.post('/onboarding/verify', authorize('super_admin', 'retailer'), verifyOnboardingOTP);

module.exports = router;
