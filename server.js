const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Database setup
const dbPath = path.join(__dirname, 'mess.db');
const db = new sqlite3.Database(dbPath, (err) => {
  console.log(err ? '❌ DB Error' : '✅ SQLite connected');
});

// JWT Secret
const JWT_SECRET = 'mess-2024-secret';

// Email setup (SendGrid-like)
const emailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: 587,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
};
const mailer = nodemailer.createTransport(emailConfig);

// SMS setup (Twilio)
const twilioClient = process.env.TWILIO_SID ? 
  twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN) : null;

// Initialize database
const initDB = () => {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY, member_id TEXT UNIQUE, name TEXT, 
      email TEXT, phone TEXT, is_active BOOLEAN DEFAULT 1, 
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    
    db.run(`CREATE TABLE IF NOT EXISTS meal_plans (
      id INTEGER PRIMARY KEY, member_id TEXT, plan_type TEXT, 
      start_date DATE, end_date DATE, amount REAL, is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    
    db.run(`CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY, member_id TEXT, date DATE, slot TEXT, 
      status TEXT DEFAULT 'Present', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    
    db.run(`CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY, member_id TEXT, amount REAL, 
      date DATE, status TEXT DEFAULT 'Due', 
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    
    db.run(`CREATE TABLE IF NOT EXISTS misuse (
      id INTEGER PRIMARY KEY, member_id TEXT, date DATE, description TEXT, 
      severity TEXT, status TEXT DEFAULT 'Open', 
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    
    db.run(`CREATE TABLE IF NOT EXISTS leave_records (
      id INTEGER PRIMARY KEY, member_id TEXT, start_date DATE, end_date DATE, 
      reason TEXT, status TEXT DEFAULT 'Pending', 
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);

    // Insert sample data
    db.get('SELECT COUNT(*) as c FROM members', (err, row) => {
      if (row.c === 0) {
        const members = [
          ['MESS-001', 'Rahul Kumar', 'rahul@example.com', '9876543210'],
          ['MESS-002', 'Priya Singh', 'priya@example.com', '9876543211'],
          ['MESS-003', 'Amit Patel', 'amit@example.com', '9876543212'],
          ['MESS-004', 'Neha Sharma', 'neha@example.com', '9876543213'],
          ['MESS-005', 'Vikram Reddy', 'vikram@example.com', '9876543214']
        ];
        members.forEach(m => {
          db.run('INSERT INTO members (member_id, name, email, phone) VALUES (?,?,?,?)', m);
        });
        console.log('✅ Sample data loaded');
      }
    });
  });
};

initDB();

// Auth middleware
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Helper to run queries
const dbQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    if (sql.startsWith('SELECT')) {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    } else {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      });
    }
  });
};

// Routes

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'password') {
    const token = jwt.sign({ user: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ data: { token, admin: { username: 'admin' } } });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Dashboard
app.get('/api/dashboard', auth, async (req, res) => {
  try {
    const members = await dbQuery('SELECT COUNT(*) as count FROM members WHERE is_active=1');
    const attendance = await dbQuery('SELECT slot, COUNT(*) as count FROM attendance WHERE date=DATE("now") GROUP BY slot');
    const expiring = await dbQuery('SELECT COUNT(*) as count FROM meal_plans WHERE end_date BETWEEN DATE("now") AND DATE("now","+3 days") AND is_active=1');
    const expired = await dbQuery('SELECT COUNT(*) as count FROM meal_plans WHERE end_date < DATE("now") AND is_active=1');
    const misuse = await dbQuery('SELECT COUNT(*) as count FROM misuse WHERE date=DATE("now")');
    const payments = await dbQuery('SELECT COUNT(*) as count FROM payments WHERE status="Due"');
    
    res.json({
      data: {
        activeMembers: members[0]?.count || 0,
        todayAttendance: attendance,
        expiringPlans: expiring[0]?.count || 0,
        expiredPlans: expired[0]?.count || 0,
        todayMisuse: misuse[0]?.count || 0,
        pendingPayments: payments[0]?.count || 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Members
app.get('/api/members', auth, async (req, res) => {
  try {
    const members = await dbQuery('SELECT * FROM members ORDER BY created_at DESC');
    res.json({ data: members });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/members', auth, async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const id = `MESS-${Date.now().toString().slice(-5)}`;
    await dbQuery('INSERT INTO members (member_id, name, email, phone) VALUES (?,?,?,?)', 
      [id, name, email, phone]);
    if (email) await mailer.sendMail({
      to: email,
      subject: 'Welcome to Mess Management',
      html: `<h1>Welcome ${name}!</h1><p>Your member ID: ${id}</p>`
    }).catch(() => {});
    res.json({ data: { id }, message: 'Member added & email sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Meal Plans
app.get('/api/meal-plans', auth, async (req, res) => {
  try {
    const plans = await dbQuery('SELECT * FROM meal_plans ORDER BY created_at DESC');
    res.json({ data: plans });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/meal-plans', auth, async (req, res) => {
  try {
    const { member_id, plan_type, start_date, end_date, amount } = req.body;
    await dbQuery('INSERT INTO meal_plans (member_id, plan_type, start_date, end_date, amount) VALUES (?,?,?,?,?)',
      [member_id, plan_type, start_date, end_date, amount]);
    res.json({ message: 'Meal plan created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Attendance
app.get('/api/attendance', auth, async (req, res) => {
  try {
    const records = await dbQuery('SELECT * FROM attendance ORDER BY created_at DESC LIMIT 100');
    res.json({ data: records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/attendance', auth, async (req, res) => {
  try {
    const { member_id, date, slot, status } = req.body;
    await dbQuery('INSERT INTO attendance (member_id, date, slot, status) VALUES (?,?,?,?)',
      [member_id, date, slot, status]);
    res.json({ message: 'Attendance recorded' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Payments
app.get('/api/payments', auth, async (req, res) => {
  try {
    const records = await dbQuery('SELECT * FROM payments ORDER BY created_at DESC');
    res.json({ data: records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payments', auth, async (req, res) => {
  try {
    const { member_id, amount, date, status } = req.body;
    await dbQuery('INSERT INTO payments (member_id, amount, date, status) VALUES (?,?,?,?)',
      [member_id, amount, date, status]);
    res.json({ message: 'Payment recorded' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Misuse
app.get('/api/misuse', auth, async (req, res) => {
  try {
    const records = await dbQuery('SELECT * FROM misuse ORDER BY created_at DESC');
    res.json({ data: records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/misuse', auth, async (req, res) => {
  try {
    const { member_id, date, description, severity } = req.body;
    await dbQuery('INSERT INTO misuse (member_id, date, description, severity) VALUES (?,?,?,?)',
      [member_id, date, description, severity]);
    res.json({ message: 'Misuse flagged' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Leave
app.get('/api/leave', auth, async (req, res) => {
  try {
    const records = await dbQuery('SELECT * FROM leave_records ORDER BY created_at DESC');
    res.json({ data: records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leave', auth, async (req, res) => {
  try {
    const { member_id, start_date, end_date, reason } = req.body;
    await dbQuery('INSERT INTO leave_records (member_id, start_date, end_date, reason) VALUES (?,?,?,?)',
      [member_id, start_date, end_date, reason]);
    res.json({ message: 'Leave application submitted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
