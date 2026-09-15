import express from 'express';
import {
  createOrder,
  trackOrder,
  getOrders,
  updateOrderStatus,
  cancelOrder,
} from '../controllers/orderController.js';

const router = express.Router();

router.route('/').post(createOrder).get(getOrders);
router.get('/track', trackOrder);
router.put('/:id/status', updateOrderStatus);
router.put('/:id/cancel', cancelOrder);

export default router;