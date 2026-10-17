import mongoose from 'mongoose';

const sellerPayoutSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    amount: { type: Number, required: true, min: 0.01 },
    balanceBefore: { type: Number, required: true, min: 0 },
    balanceAfter: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR', immutable: true },
    reference: { type: String, trim: true, maxlength: 120 },
    note: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

export default mongoose.model('SellerPayout', sellerPayoutSchema);
