import mongoose from 'mongoose';
import Seller from '../models/Seller.js';
import SellerEarning from '../models/SellerEarning.js';
import SellerPayout from '../models/SellerPayout.js';

const roundCurrency = (amount) => Math.round((amount + Number.EPSILON) * 100) / 100;

export const getSellerFinance = async (req, res) => {
  try {
    const [seller, earnings, payouts] = await Promise.all([
      Seller.findById(req.seller._id).select('currentBalance lifetimeEarnings'),
      SellerEarning.find({ seller: req.seller._id }).sort({ createdAt: -1 }),
      SellerPayout.find({ seller: req.seller._id }).sort({ createdAt: -1 }),
    ]);
    if (!seller) return res.status(404).json({ message: 'Seller not found' });
    res.json({
      currentBalance: seller.currentBalance,
      lifetimeEarnings: seller.lifetimeEarnings,
      currency: 'INR',
      earnings,
      payouts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSellerPayouts = async (req, res) => {
  try {
    const payouts = await SellerPayout.find({ seller: req.params.id }).sort({ createdAt: -1 });
    res.json(payouts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const settleSellerBalance = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const seller = await Seller.findById(req.params.id).session(session);
      if (!seller) {
        const error = new Error('Seller not found');
        error.statusCode = 404;
        throw error;
      }

      const amount = roundCurrency(seller.currentBalance || 0);
      if (amount <= 0) {
        const error = new Error('Seller has no outstanding balance to settle');
        error.statusCode = 409;
        throw error;
      }

      const update = await Seller.updateOne(
        { _id: seller._id, currentBalance: seller.currentBalance },
        { $set: { currentBalance: 0 } },
        { session }
      );
      if (update.matchedCount !== 1) {
        const error = new Error('Seller balance changed; retry the settlement');
        error.statusCode = 409;
        throw error;
      }

      const [payout] = await SellerPayout.create(
        [
          {
            seller: seller._id,
            paidBy: req.admin._id,
            amount,
            balanceBefore: amount,
            balanceAfter: 0,
            reference: req.body.reference,
            note: req.body.note,
          },
        ],
        { session }
      );
      result = { sellerId: seller._id, payout };
    });
    res.status(201).json({
      message: 'Seller balance settled',
      ...result,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  } finally {
    await session.endSession();
  }
};
