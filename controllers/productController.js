import Product from '../models/Product.js';

const serializeProduct = (product) => {
  const serialized = product.toObject();
  if (serialized.seller) {
    serialized.availableQuantity = Math.max(
      0,
      (serialized.stockQuantity || 0) - (serialized.reservedQuantity || 0)
    );
    serialized.inStock = serialized.inStock && serialized.availableQuantity > 0;
  }
  return serialized;
};

// @desc Get all products (optionally filter by category)
export const getProducts = async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    const products = await Product.find(filter);
    res.json(products.map(serializeProduct));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(serializeProduct(product));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (product.seller) {
      return res.status(403).json({ message: 'Only the product seller can update this product' });
    }
    Object.assign(product, req.body);
    await product.save();
    res.json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (product.seller) {
      return res.status(403).json({ message: 'Only the product seller can delete this product' });
    }
    await product.deleteOne();
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};