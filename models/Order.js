import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' },
  name: { type: String, required: true }, // snapshot at order time
  quantity: { type: Number, min: 0.01 },
  unit: { type: String, enum: ['kg', 'liter', 'piece'] },
  unitPrice: { type: Number, min: 0 },
  weight: { type: Number, min: 0 }, // legacy kg field
  pricePerKg: { type: Number, min: 0 }, // legacy kg field
  subtotal: { type: Number, required: true },
  cuttingPreference: { type: String, default: '' },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    items: [orderItemSchema],
    customer: {
      name: { type: String, required: true },
      whatsappNumber: { type: String, required: true },
      address: { type: String, required: true },
      pincode: { type: String, required: true },
      email: { type: String },
    },
    deliverySlot: { type: String }, // e.g. "6 PM - 8 PM"
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['COD', 'ONLINE'], default: 'COD' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Order', orderSchema);