import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Seller from '../models/Seller.js';
import SellerEarning from '../models/SellerEarning.js';
import { generateOrderNumber } from '../utils/generateOrderNumber.js';

const roundCurrency = (amount) => Math.round((amount + Number.EPSILON) * 100) / 100;
const validStatuses = [
  'pending',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

export const createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let createdOrder;
    await session.withTransaction(async () => {
      const requestedItems = req.body.items;
      if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
        const error = new Error('Order must contain at least one item');
        error.statusCode = 400;
        throw error;
      }

      const items = [];
      let totalAmount = 0;
      for (const requestedItem of requestedItems) {
        const product = await Product.findById(requestedItem.product).session(session);
        if (!product) {
          const error = new Error(`Product not found: ${requestedItem.product}`);
          error.statusCode = 400;
          throw error;
        }
        if (!product.inStock) {
          const error = new Error(`${product.name} is not currently available`);
          error.statusCode = 400;
          throw error;
        }

        const quantity = Number(requestedItem.quantity ?? requestedItem.weight);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          const error = new Error(`A valid quantity is required for ${product.name}`);
          error.statusCode = 400;
          throw error;
        }
        const unit = requestedItem.unit || product.stockUnit || 'kg';
        const minimumQuantity = product.minOrderQuantity ?? product.minOrderWeight ?? 0.5;
        if (quantity < minimumQuantity) {
          const error = new Error(`${product.name} minimum order quantity is ${minimumQuantity} ${unit}`);
          error.statusCode = 400;
          throw error;
        }
        if (unit !== product.stockUnit) {
          const error = new Error(`${product.name} is sold by ${product.stockUnit}`);
          error.statusCode = 400;
          throw error;
        }

        let sellerId;
        if (product.seller) {
          const seller = await Seller.findById(product.seller).session(session);
          if (!seller || seller.status !== 'verified') {
            const error = new Error(`${product.name} is not currently available`);
            error.statusCode = 400;
            throw error;
          }

          const reservedProduct = await Product.findOneAndUpdate(
            {
              _id: product._id,
              seller: seller._id,
              inStock: true,
              $expr: {
                $gte: [
                  {
                    $subtract: [
                      '$stockQuantity',
                      { $ifNull: ['$reservedQuantity', 0] },
                    ],
                  },
                  quantity,
                ],
              },
            },
            { $inc: { reservedQuantity: quantity } },
            { returnDocument: 'after', session }
          );
          if (!reservedProduct) {
            const error = new Error(`Insufficient available stock for ${product.name}`);
            error.statusCode = 409;
            throw error;
          }
          sellerId = seller._id;
        }

        const unitPrice =
          unit === 'kg'
            ? product.pricePerKg ?? product.pricePerUnit
            : product.pricePerUnit ?? product.pricePerKg;
        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          const error = new Error(`${product.name} does not have a valid price`);
          error.statusCode = 400;
          throw error;
        }
        const subtotal = roundCurrency(quantity * unitPrice);
        totalAmount = roundCurrency(totalAmount + subtotal);
        items.push({
          product: product._id,
          seller: sellerId,
          name: product.name,
          quantity,
          unit,
          unitPrice,
          ...(unit === 'kg' ? { weight: quantity, pricePerKg: unitPrice } : {}),
          subtotal,
          cuttingPreference: requestedItem.cuttingPreference || '',
        });
      }

      const requestedPaymentMethod = req.body.paymentMethod ?? 'COD';
      if (typeof requestedPaymentMethod !== 'string') {
        const error = new Error('Payment method must be COD or ONLINE');
        error.statusCode = 400;
        throw error;
      }
      const paymentMethod = requestedPaymentMethod.toUpperCase();
      if (!['COD', 'ONLINE'].includes(paymentMethod)) {
        const error = new Error('Payment method must be COD or ONLINE');
        error.statusCode = 400;
        throw error;
      }

      const order = new Order({
        orderNumber: generateOrderNumber(),
        items,
        customer: req.body.customer,
        deliverySlot: req.body.deliverySlot,
        totalAmount,
        paymentMethod,
        paymentStatus: 'pending',
        status: 'pending',
      });
      await order.save({ session });
      createdOrder = order;
    });

    res.status(201).json(createdOrder);
  } catch (error) {
    const statusCode =
      error.statusCode || (['ValidationError', 'CastError'].includes(error.name) ? 400 : 500);
    res.status(statusCode).json({ message: error.message });
  } finally {
    await session.endSession();
  }
};

// Track by orderNumber + whatsappNumber (no login needed)
export const trackOrder = async (req, res) => {
  try {
    const { orderNumber, whatsappNumber } = req.query;
    const order = await Order.findOne({
      orderNumber,
      'customer.whatsappNumber': whatsappNumber,
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: get all orders
export const getOrders = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { status } = req.body;
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid order status' });
    }

    let updatedOrder;
    await session.withTransaction(async () => {
      const order = await Order.findById(req.params.id).session(session);
      if (!order) {
        const error = new Error('Order not found');
        error.statusCode = 404;
        throw error;
      }
      if (order.status === 'delivered' && status !== 'delivered') {
        const error = new Error('A delivered order cannot be moved to another status');
        error.statusCode = 400;
        throw error;
      }
      if (order.status === 'cancelled' && status !== 'cancelled') {
        const error = new Error('A cancelled order cannot be reopened');
        error.statusCode = 400;
        throw error;
      }

      if (status === 'delivered' && order.status !== 'delivered') {
        if (order.paymentMethod === 'ONLINE' && order.paymentStatus !== 'paid') {
          const error = new Error('Online payment must be confirmed before marking this order delivered');
          error.statusCode = 409;
          throw error;
        }

        const totalsBySeller = new Map();
        for (const item of order.items) {
          if (!item.seller) continue;

          const product = await Product.findOneAndUpdate(
            {
              _id: item.product,
              seller: item.seller,
              reservedQuantity: { $gte: item.quantity },
              stockQuantity: { $gte: item.quantity },
            },
            {
              $inc: {
                stockQuantity: -item.quantity,
                reservedQuantity: -item.quantity,
              },
            },
            { returnDocument: 'after', session }
          );
          if (!product) {
            const error = new Error(
              `Could not deduct reserved stock for ${item.name}; delivery update was not applied`
            );
            error.statusCode = 409;
            throw error;
          }

          const sellerKey = item.seller.toString();
          totalsBySeller.set(
            sellerKey,
            roundCurrency((totalsBySeller.get(sellerKey) || 0) + item.subtotal)
          );
        }

        for (const [sellerId, amount] of totalsBySeller) {
          await SellerEarning.create(
            [
              {
                seller: sellerId,
                order: order._id,
                orderNumber: order.orderNumber,
                amount,
              },
            ],
            { session }
          );
          const sellerUpdate = await Seller.updateOne(
            { _id: sellerId },
            { $inc: { currentBalance: amount, lifetimeEarnings: amount } },
            { session }
          );
          if (sellerUpdate.matchedCount !== 1) {
            const error = new Error(`Seller ${sellerId} for this order no longer exists`);
            error.statusCode = 409;
            throw error;
          }
        }
      }

      if (status === 'cancelled' && order.status !== 'cancelled') {
        for (const item of order.items) {
          if (!item.seller) continue;
          const product = await Product.findOneAndUpdate(
            {
              _id: item.product,
              seller: item.seller,
              reservedQuantity: { $gte: item.quantity },
            },
            { $inc: { reservedQuantity: -item.quantity } },
            { returnDocument: 'after', session }
          );
          if (!product) {
            const error = new Error(`Could not release reserved stock for ${item.name}`);
            error.statusCode = 409;
            throw error;
          }
        }
      }

      if (status === 'delivered' && order.paymentMethod === 'COD') {
        order.paymentStatus = 'paid';
      }

      order.status = status;
      await order.save({ session });
      updatedOrder = order;
    });

    res.json(updatedOrder);
  } catch (error) {
    const statusCode =
      error.statusCode || (['ValidationError', 'CastError'].includes(error.name) ? 400 : 500);
    res.status(statusCode).json({ message: error.message });
  } finally {
    await session.endSession();
  }
};

export const updateOrderPaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    if (!['paid', 'failed'].includes(paymentStatus)) {
      return res.status(400).json({ message: 'Payment status must be paid or failed' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.paymentMethod !== 'ONLINE') {
      return res.status(400).json({ message: 'Only online orders can be updated through this endpoint' });
    }
    if (order.paymentStatus === 'paid' && paymentStatus !== 'paid') {
      return res.status(409).json({ message: 'A paid order cannot be marked as unpaid' });
    }

    order.paymentStatus = paymentStatus;
    await order.save();
    res.json(order);
  } catch (error) {
    const statusCode =
      ['ValidationError', 'CastError'].includes(error.name) ? 400 : 500;
    res.status(statusCode).json({ message: error.message });
  }
};

export const cancelOrder = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let cancelledOrder;
    await session.withTransaction(async () => {
      const order = await Order.findById(req.params.id).session(session);
      if (!order) {
        const error = new Error('Order not found');
        error.statusCode = 404;
        throw error;
      }
      if (!['pending', 'confirmed'].includes(order.status)) {
        const error = new Error('Order can no longer be cancelled');
        error.statusCode = 400;
        throw error;
      }

      for (const item of order.items) {
        if (!item.seller) continue;
        const product = await Product.findOneAndUpdate(
          {
            _id: item.product,
            seller: item.seller,
            reservedQuantity: { $gte: item.quantity },
          },
          { $inc: { reservedQuantity: -item.quantity } },
          { returnDocument: 'after', session }
        );
        if (!product) {
          const error = new Error(`Could not release reserved stock for ${item.name}`);
          error.statusCode = 409;
          throw error;
        }
      }

      order.status = 'cancelled';
      await order.save({ session });
      cancelledOrder = order;
    });
    res.json(cancelledOrder);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  } finally {
    await session.endSession();
  }
};
