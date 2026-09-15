import Order from '../models/Order.js';
import { generateOrderNumber } from '../utils/generateOrderNumber.js';

export const createOrder = async (req, res) => {
  try {
    const orderNumber = generateOrderNumber();
    const order = await Order.create({ ...req.body, orderNumber });
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
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
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Prevent customer-side cancel once preparing has started (enforce in frontend too)
    order.status = req.body.status;
    await order.save();
    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ message: 'Order can no longer be cancelled' });
    }
    order.status = 'cancelled';
    await order.save();
    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};