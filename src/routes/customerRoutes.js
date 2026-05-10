const express = require('express');
const { createCustomer, getCustomers, getCustomerById } = require('../controllers/customerController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(protect);

router.post('/', authorize('super_admin', 'retailer'), createCustomer);
router.get('/', getCustomers);
router.get('/:id', getCustomerById);

module.exports = router;
