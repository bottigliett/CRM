import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import contactRoutes from './routes/contact.routes';
import leadRoutes from './routes/lead.routes';
import eventRoutes from './routes/event.routes';
import taskRoutes from './routes/task.routes';
import projectRoutes from './routes/project.routes';
import userPreferenceRoutes from './routes/user-preference.routes';
import transactionRoutes from './routes/transaction.routes';
import paymentMethodRoutes from './routes/payment-method.routes';
import notificationRoutes from './routes/notification.routes';
import invoiceRoutes from './routes/invoice.routes';
import { errorHandler, notFound } from './middleware/errorHandler';

// Load .env from backend root directory (not from dist/)
const envPath = path.join(__dirname, '../.env');
console.log('🔍 Loading .env from:', envPath);
const result = dotenv.config({ path: envPath, override: true });
if (result.error) {
  console.error('❌ Error loading .env:', result.error);
} else {
  console.log('✅ .env loaded successfully with', Object.keys(result.parsed || {}).length, 'variables');
  console.log('📧 MAIL_PASSWORD loaded:', process.env.MAIL_PASSWORD ? '✓' : '✗');
}

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
app.use('/api', projectRoutes);
app.use('/api/user-preferences', userPreferenceRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/payment-methods', paymentMethodRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/invoices', invoiceRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;
