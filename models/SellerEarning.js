import mongoose from 'mongoose';

const sellerEarningSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    orderNumber: { type: String, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, default: 'INR', immutable: true },
  },
  { timestamps: true }
);

sellerEarningSchema.index({ seller: 1, order: 1 }, { unique: true });

export default mongoose.model('SellerEarning', sellerEarningSchema);
