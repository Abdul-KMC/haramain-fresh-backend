import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// @desc Register admin — use this ONCE to create your account, then disable/remove the route
export const registerAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;
    const exists = await Admin.findOne({ username });
    if (exists) return res.status(400).json({ message: 'Admin already exists' });

    const admin = await Admin.create({ username, password });
    res.status(201).json({
      _id: admin._id,
      username: admin.username,
      token: generateToken(admin._id),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });

    if (admin && (await admin.matchPassword(password))) {
      res.json({
        _id: admin._id,
        username: admin.username,
        token: generateToken(admin._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};