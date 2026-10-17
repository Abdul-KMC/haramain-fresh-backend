import jwt from 'jsonwebtoken';
import Seller from '../models/Seller.js';

const generateToken = (id) =>
  jwt.sign({ id, role: 'seller' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

export const registerSeller = async (req, res) => {
  try {
    const { businessName, ownerName, email, phone, city, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    if (!businessName || !ownerName || !normalizedEmail || !phone || !city || !password) {
      return res.status(400).json({ message: 'All seller registration fields are required' });
    }

    const exists = await Seller.findOne({ email: normalizedEmail });
    if (exists) {
      return res.status(409).json({ message: 'A seller account with this email already exists' });
    }

    const seller = await Seller.create({
      businessName,
      ownerName,
      email: normalizedEmail,
      phone,
      city,
      password,
    });
    res.status(201).json({
      _id: seller._id,
      businessName: seller.businessName,
      status: seller.status,
      message: 'Seller application submitted for admin verification',
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A seller account with this email already exists' });
    }
    res.status(400).json({ message: error.message });
  }
};

export const loginSeller = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const { password } = req.body;
    const seller = email ? await Seller.findOne({ email }) : null;

    if (!seller || !(await seller.matchPassword(password || ''))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (seller.status !== 'verified') {
      return res.status(403).json({ message: `Seller account is ${seller.status}` });
    }

    res.json({
      _id: seller._id,
      businessName: seller.businessName,
      status: seller.status,
      token: generateToken(seller._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
