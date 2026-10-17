import jwt from 'jsonwebtoken';
import Seller from '../models/Seller.js';

export const protectSeller = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const token = authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'seller') {
      return res.status(401).json({ message: 'Not authorized as a seller' });
    }

    const seller = await Seller.findById(decoded.id).select('-password');
    if (!seller) {
      return res.status(401).json({ message: 'Not authorized, seller not found' });
    }
    if (seller.status !== 'verified') {
      return res.status(403).json({ message: 'Seller account is not active' });
    }

    req.seller = seller;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token invalid' });
  }
};
