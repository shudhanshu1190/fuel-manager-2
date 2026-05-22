import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';

// Route imports
import authRoutes from './routes/auth.js';
import shiftRoutes from './routes/shift.js';
import salesRoutes from './routes/sales.js';
import creditRoutes from './routes/credit.js';
import counterRoutes from './routes/counter.js';
import reportsRoutes from './routes/reports.js';
import auditRoutes from './routes/audit.js';

// Load env variables
dotenv.config();

// Connect to MongoDB
connectDB().then(async () => {
  try {
    const { default: User } = await import('./models/User.js');
    const result = await User.deleteMany({ role: { $ne: 'Owner' } });
    if (result.deletedCount > 0) {
      console.log(`Database Cleanup: Deleted ${result.deletedCount} non-Owner user accounts.`);
    }
  } catch (err) {
    console.error('Error cleaning up non-Owner users:', err.message);
  }
});

const app = express();

// Middlewares
app.use(cors({ origin: '*' })); // Allow all for local dev / testing
app.use(express.json());

// API Route Registration
app.use('/api/auth', authRoutes);
app.use('/api/shift', shiftRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/credit', creditRoutes);
app.use('/api/counter', counterRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/audit', auditRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'FuelLedger Backend is running smoothly', time: new Date() });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack);
  res.status(500).json({
    message: 'An internal server error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : {},
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`FuelLedger Backend server running on port ${PORT}`);
});
