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
import onDutyRoutes from './routes/on-duty.routes';
import quoteRoutes from './routes/quote.routes';
import clientAccessRoutes from './routes/client-access.routes';
import clientAuthRoutes from './routes/client-auth.routes';
import publicRoutes from './routes/public.routes';
import activateRoutes from './routes/activate.routes';
import ticketRoutes, { clientTicketRouter } from './routes/ticket.routes';
import attachmentRoutes, { clientAttachmentRouter } from './routes/attachment.routes';
import adminNotificationRoutes, { clientNotificationRouter } from './routes/client-notification.routes';
import clientInvoiceRoutes from './routes/client-invoice.routes';
import clientTaskRoutes from './routes/client-task.routes';
import clientEventRoutes from './routes/client-event.routes';
import clientQuoteRoutes from './routes/client-quote.routes';
import projectTaskRoutes from './routes/project-task.routes';
import clientProjectTaskRoutes from './routes/client-project-task.routes';
import announcementRoutes, { clientAnnouncementRouter } from './routes/announcement.routes';
import { errorHandler, notFound } from './middleware/errorHandler';
import { initializeUploadsDirectory } from './utils/file-upload';

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

// Initialize uploads directory
initializeUploadsDirectory().catch(console.error);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'MismoStudio CRM API is running' });
});

// Routes
// ACTIVATION ROUTES - Must be FIRST to avoid middleware blocking
app.use('/api/activate', activateRoutes);

// ATTACHMENT ROUTES - Must be before any /api router with router.use(authenticate)
app.use('/api/attachments', attachmentRoutes);
app.use('/api/client/attachments', clientAttachmentRouter);

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
app.use('/api/on-duty', onDutyRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api', projectTaskRoutes); // Project task routes (/api/quotes/:quoteId/tasks)
app.use('/api/client-access', clientAccessRoutes);
app.use('/api/client-auth', clientAuthRoutes);
app.use('/api/public', publicRoutes); // Public endpoints (workaround for 401 issue)
app.use('/api/tickets', ticketRoutes);
app.use('/api/admin/notifications', adminNotificationRoutes);
app.use('/api/announcements', announcementRoutes);

// Client-specific routes (require client authentication)
app.use('/api/client/tickets', clientTicketRouter);
app.use('/api/client/notifications', clientNotificationRouter);
app.use('/api/client/invoices', clientInvoiceRoutes);
app.use('/api/client/tasks', clientTaskRoutes);
app.use('/api/client/events', clientEventRoutes);
app.use('/api/client/quotes', clientQuoteRoutes);
app.use('/api/client/project-tasks', clientProjectTaskRoutes);
app.use('/api/client/announcements', clientAnnouncementRouter);

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;
