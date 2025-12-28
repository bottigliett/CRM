import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import contactRoutes from './routes/contact.routes';
import leadRoutes from './routes/lead.routes';
import eventRoutes from './routes/event.routes';
import taskRoutes from './routes/task.routes';
import userPreferenceRoutes from './routes/user-preference.routes';
import transactionRoutes from './routes/transaction.routes';
import paymentMethodRoutes from './routes/payment-method.routes';
import notificationRoutes from './routes/notification.routes';
import invoiceRoutes from './routes/invoice.routes';
import { errorHandler, notFound } from './middleware/errorHandler';

dotenv.config();

const app: Application = express();

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5174',
  credentials: true,
  optionsSuccessStatus: 200,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'MismoStudio CRM API is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/events', eventRoutes);
app.use('/api', taskRoutes);
app.use('/api/user-preferences', userPreferenceRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/payment-methods', paymentMethodRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/invoices', invoiceRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;
