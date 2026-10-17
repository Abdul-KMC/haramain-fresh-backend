import Product from '../models/Product.js';

const editableFields = [
  'name',
  'category',
  'cutType',
  'pricePerKg',
  'pricePerUnit',
  'stockQuantity',
  'stockUnit',
  'description',
  'images',
  'preparationVideoUrl',
  'inStock',
  'minOrderWeight',
  'minOrderQuantity',
];

const pickEditableFields = (body) =>
  Object.fromEntries(
    editableFields
      .filter((field) => body[field] !== undefined)
      .map((field) => [field, body[field]])
  );

export const getSellerProducts = async (req, res) => {
  try {
    const products = await Product.find({ seller: req.seller._id }).sort({ createdAt: -1 });
    res.json(
      products.map((product) => ({
        ...product.toObject(),
        availableQuantity: Math.max(
          0,
          product.stockQuantity - (product.reservedQuantity || 0)
        ),
      }))
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createSellerProduct = async (req, res) => {
  try {
    const fields = pickEditableFields(req.body);
    if (
      typeof fields.name !== 'string' ||
      !fields.name.trim() ||
      typeof fields.category !== 'string' ||
      !fields.category.trim() ||
      typeof fields.description !== 'string' ||
      !fields.description.trim() ||
      !Array.isArray(fields.images) ||
      fields.images.length === 0 ||
      fields.images.some((image) => typeof image !== 'string' || !image.trim()) ||
      fields.stockQuantity === undefined ||
      !fields.stockUnit ||
      (fields.pricePerKg === undefined && fields.pricePerUnit === undefined)
    ) {
      return res.status(400).json({
        message: 'Name, category, description, photo, price, stock quantity, and stock unit are required',
      });
    }

    if (fields.inStock === undefined) fields.inStock = fields.stockQuantity > 0;
    const product = await Product.create({
      ...fields,
      seller: req.seller._id,
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateSellerProduct = async (req, res) => {
  try {
    const fields = pickEditableFields(req.body);
    if (
      fields.images &&
      (!Array.isArray(fields.images) ||
        fields.images.length === 0 ||
        fields.images.some((image) => typeof image !== 'string' || !image.trim()))
    ) {
      return res.status(400).json({ message: 'At least one product photo is required' });
    }
    const currentProduct = await Product.findOne({
      _id: req.params.id,
      seller: req.seller._id,
    });
    if (!currentProduct) return res.status(404).json({ message: 'Product not found' });
    if (
      fields.stockQuantity !== undefined &&
      fields.stockQuantity < (currentProduct.reservedQuantity || 0)
    ) {
      return res.status(409).json({
        message: `Stock cannot be lower than ${currentProduct.reservedQuantity || 0} reserved ${currentProduct.stockUnit}`,
      });
    }
    if (fields.stockQuantity !== undefined && fields.inStock === undefined) {
      fields.inStock =
        fields.stockQuantity > (currentProduct.reservedQuantity || 0);
    }

    const filter = { _id: req.params.id, seller: req.seller._id };
    if (fields.stockQuantity !== undefined) {
      filter.$expr = {
        $gte: [fields.stockQuantity, { $ifNull: ['$reservedQuantity', 0] }],
      };
    }

    const product = await Product.findOneAndUpdate(
      filter,
      { $set: fields },
      { returnDocument: 'after', runValidators: true }
    );
    if (!product) {
      const stillOwned = await Product.exists({
        _id: req.params.id,
        seller: req.seller._id,
      });
      if (stillOwned && fields.stockQuantity !== undefined) {
        return res.status(409).json({
          message: 'Stock cannot be lower than the quantity reserved for active orders',
        });
      }
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteSellerProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      seller: req.seller._id,
    });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (product.reservedQuantity > 0) {
      return res.status(409).json({
        message: 'Product cannot be deleted while it has quantities reserved for active orders',
      });
    }
    await product.deleteOne();
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
