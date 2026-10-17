import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import connectDB from './config/db.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import sellerAuthRoutes from './routes/sellerAuthRoutes.js';
import sellerAdminRoutes from './routes/sellerAdminRoutes.js';
import sellerProductRoutes from './routes/sellerProductRoutes.js';

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/sellers/auth', sellerAuthRoutes);
app.use('/api/admin/sellers', sellerAdminRoutes);
app.use('/api/seller/products', sellerProductRoutes);

app.get('/', (req, res) => res.send('Haramain Fresh API is running'));

app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));