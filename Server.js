const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

const app = express();

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(compression());
app.use(cors());
app.use(express.json());

// Database Connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Login Endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const result = await pool.query(
      'SELECT * FROM admin_settings WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = result.rows[0];
    const validPassword = await bcrypt.compare(password, admin.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        full_name: admin.full_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get All Members
app.get('/api/members', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM members ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Single Member
app.get('/api/members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM members WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add Member
app.post('/api/members', async (req, res) => {
  try {
    const { full_name, mobile_number, email, joining_date } = req.body;
    
    const result = await pool.query(
      'INSERT INTO members (full_name, mobile_number, email, joining_date) VALUES ($1, $2, $3, $4) RETURNING *',
      [full_name, mobile_number, email, joining_date]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark Attendance
app.post('/api/attendance', async (req, res) => {
  try {
    const { member_id, slot_id, attendance_date, status } = req.body;
    
    const result = await pool.query(
      'INSERT INTO attendance_records (member_id, slot_id, attendance_date, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [member_id, slot_id, attendance_date, status]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Today's Attendance
app.get('/api/attendance/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await pool.query(
      'SELECT * FROM attendance_records WHERE attendance_date = $1 ORDER BY created_at DESC',
      [today]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add Payment
app.post('/api/payments', async (req, res) => {
  try {
    const { member_id, payment_amount, payment_date, payment_status } = req.body;
    
    const result = await pool.query(
      'INSERT INTO payment_records (member_id, payment_amount, payment_date, payment_status) VALUES ($1, $2, $3, $4) RETURNING *',
      [member_id, payment_amount, payment_date, payment_status]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Member Payments
app.get('/api/members/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM payment_records WHERE member_id = $1 ORDER BY payment_date DESC',
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Dashboard Summary
app.get('/api/dashboard', async (req, res) => {
  try {
    const membersResult = await pool.query('SELECT COUNT(*) as total FROM members WHERE status = $1', ['Active']);
    const attendanceResult = await pool.query('SELECT COUNT(*) as total FROM attendance_records WHERE attendance_date = $1', [new Date().toISOString().split('T')[0]]);
    const paymentsResult = await pool.query('SELECT COUNT(*) as total FROM payment_records WHERE payment_status = $1', ['Pending']);

    res.json({
      total_members: membersResult.rows[0].total,
      todays_attendance: attendanceResult.rows[0].total,
      pending_payments: paymentsResult.rows[0].total
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Meal Slots
app.get('/api/meal-slots', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM meal_slots ORDER BY slot_name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});