import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "Goat Curry Cut"
    category: { type: String, required: true, trim: true, lowercase: true },
    cutType: { type: String, trim: true }, // e.g. "curry cut", "boneless", "keema"
    pricePerKg: {
      type: Number,
      min: 0,
      required: function () {
        return this.pricePerUnit == null;
      },
    },
    pricePerUnit: {
      type: Number,
      min: 0,
      required: function () {
        return this.pricePerKg == null;
      },
    },
    stockQuantity: { type: Number, min: 0, default: 0 },
    reservedQuantity: { type: Number, min: 0, default: 0 },
    stockUnit: { type: String, enum: ['kg', 'liter', 'piece'], default: 'kg' },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' },
    description: { type: String, trim: true },
    images: [{ type: String }], // URLs
    preparationVideoUrl: { type: String, trim: true },
    inStock: { type: Boolean, default: true },
    minOrderWeight: { type: Number, default: 0.5 }, // kg
    minOrderQuantity: { type: Number, min: 0, default: 0.5 },
  },
  { timestamps: true }
);

export default mongoose.model('Product', productSchema);