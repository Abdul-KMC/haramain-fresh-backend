import express from 'express';
import {
  createOrder,
  trackOrder,
  getOrders,
  updateOrderStatus,
  cancelOrder,
} from '../controllers/orderController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/').post(createOrder).get(protect, getOrders);
router.get('/track', trackOrder); // public — customer lookup
router.put('/:id/status', protect, updateOrderStatus);
router.put('/:id/cancel', cancelOrder); // public — customer can self-cancel while pending/confirmed

export default router;