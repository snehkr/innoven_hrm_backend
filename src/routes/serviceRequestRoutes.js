const { createServiceRequest, getServiceRequests, updateStatus, onboardAndCreateRequest } = require('../controllers/serviceRequestController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(protect);

router.post('/', authorize('super_admin', 'retailer'), createServiceRequest);
router.get('/', getServiceRequests);
router.post('/onboard-request', authorize('super_admin', 'retailer'), onboardAndCreateRequest);
router.patch('/:id/status', authorize('super_admin', 'service_center', 'engineer'), updateStatus);

module.exports = router;
