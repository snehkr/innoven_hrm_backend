const express = require('express');
const { sendOTP, verifyOTP } = require('../controllers/otpController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(protect);

router.post('/send', authorize('super_admin', 'engineer'), sendOTP);
router.post('/verify', authorize('super_admin', 'engineer'), verifyOTP);

module.exports = router;
