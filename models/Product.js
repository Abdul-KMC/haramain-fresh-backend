import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "Goat Curry Cut"
    category: {
      type: String,
      required: true,
      enum: ['chicken', 'goat', 'fish', 'buff'],
    },
    cutType: { type: String, trim: true }, // e.g. "curry cut", "boneless", "keema"
    pricePerKg: { type: Number, required: true },
    description: { type: String, trim: true },
    images: [{ type: String }], // URLs
    inStock: { type: Boolean, default: true },
    minOrderWeight: { type: Number, default: 0.5 }, // kg
  },
  { timestamps: true }
);

export default mongoose.model('Product', productSchema);