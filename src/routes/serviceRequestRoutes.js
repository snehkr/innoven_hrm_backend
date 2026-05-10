const express = require('express');
const { createServiceRequest, getServiceRequests, updateStatus } = require('../controllers/serviceRequestController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(protect);

router.post('/', authorize('super_admin', 'retailer'), createServiceRequest);
router.get('/', getServiceRequests);
router.patch('/:id/status', authorize('super_admin', 'service_center', 'engineer'), updateStatus);

module.exports = router;
