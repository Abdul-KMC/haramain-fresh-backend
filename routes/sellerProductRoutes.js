import express from 'express';
import {
  createSellerProduct,
  deleteSellerProduct,
  getSellerProducts,
  updateSellerProduct,
} from '../controllers/sellerProductController.js';
import { protectSeller } from '../middleware/sellerAuth.js';

const router = express.Router();

router.use(protectSeller);
router.route('/').get(getSellerProducts).post(createSellerProduct);
router.route('/:id').put(updateSellerProduct).delete(deleteSellerProduct);

export default router;
