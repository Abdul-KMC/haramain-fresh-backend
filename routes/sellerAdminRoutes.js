import express from 'express';
import {
  getSellerById,
  getSellers,
  removeSeller,
  updateSellerStatus,
} from '../controllers/sellerAdminController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.get('/', getSellers);
router.get('/:id', getSellerById);
router.put('/:id/status', updateSellerStatus);
router.delete('/:id', removeSeller);

export default router;
