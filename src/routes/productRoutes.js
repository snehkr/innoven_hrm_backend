const express = require('express');
const { addProduct, getProducts, assignCustomer } = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', authorize('super_admin', 'distributor', 'wholesaler', 'retailer'), addProduct);
router.get('/', getProducts);
router.patch('/:id/assign-customer', authorize('super_admin', 'retailer'), assignCustomer);

module.exports = router;
