const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

const { errorHandler } = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/authMiddleware');

const app = express();

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Health Check (No Auth Required)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Import Routes
const authRoutes = require('./routes/auth');
const memberRoutes = require('./routes/members');
const mealPlanRoutes = require('./routes/mealPlans');
const paymentRoutes = require('./routes/payments');
const attendanceRoutes = require('./routes/attendance');
const dashboardRoutes = require('./routes/dashboard');

// Register Routes (No Auth - Login)
app.use('/api/auth', authRoutes);

// Register Protected Routes (Require Auth)
app.use('/api/members', authenticateToken, memberRoutes);
app.use('/api/meal-plans', authenticateToken, mealPlanRoutes);
app.use('/api/payments', authenticateToken, paymentRoutes);
app.use('/api/attendance', authenticateToken, attendanceRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);

// Error Handler (Must be last)
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;

// Import Renewal Routes
const renewalRoutes = require('./routes/renewals');
app.use('/api/renewals', authenticateToken, renewalRoutes);

// Setup daily renewal alerts
const { setupDailyAlerts } = require('./services/alertService');
setupDailyAlerts();
