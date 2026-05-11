const express = require('express');
const { createRequest, assignServiceCenter, assignEngineer, getAssignedJobs, completeInstallation, getAllRequests } = require('../controllers/installationController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', getAllRequests);
router.post('/', authorize('super_admin', 'retailer', 'customer'), createRequest);
router.get('/assigned', authorize('engineer'), getAssignedJobs);
router.patch('/:id/assign-service-center', authorize('super_admin'), assignServiceCenter);
router.patch('/:id/assign-engineer', authorize('super_admin', 'service_center'), assignEngineer);
router.post('/:id/complete', authorize('engineer'), upload.single('image'), completeInstallation);

module.exports = router;
