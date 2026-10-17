import express from 'express';
import { getSellerFinance } from '../controllers/sellerFinanceController.js';
import { protectSeller } from '../middleware/sellerAuth.js';

const router = express.Router();

router.get('/', protectSeller, getSellerFinance);

export default router;
