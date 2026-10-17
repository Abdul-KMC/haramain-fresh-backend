import Product from '../models/Product.js';
import Seller from '../models/Seller.js';

export const getSellers = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      if (!['pending', 'verified', 'suspended', 'removed'].includes(req.query.status)) {
        return res.status(400).json({ message: 'Invalid seller status filter' });
      }
      filter.status = req.query.status;
    }
    const sellers = await Seller.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(sellers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSellerById = async (req, res) => {
  try {
    const seller = await Seller.findById(req.params.id).select('-password');
    if (!seller) return res.status(404).json({ message: 'Seller not found' });

    const products = await Product.find({ seller: seller._id });
    res.json({ ...seller.toObject(), products });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateSellerStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'verified', 'suspended'].includes(status)) {
      return res.status(400).json({ message: 'Status must be pending, verified, or suspended' });
    }

    const seller = await Seller.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).select('-password');
    if (!seller) return res.status(404).json({ message: 'Seller not found' });
    res.json(seller);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const removeSeller = async (req, res) => {
  try {
    const seller = await Seller.findByIdAndUpdate(
      req.params.id,
      { status: 'removed' },
      { new: true, runValidators: true }
    ).select('-password');
    if (!seller) return res.status(404).json({ message: 'Seller not found' });
    res.json({ message: 'Seller access removed', seller });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
