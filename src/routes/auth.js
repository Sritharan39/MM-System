const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responseHelper');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return sendError(res, 'Username and password required', 400, 'MISSING_FIELDS');
    }

    const result = await pool.query(
      'SELECT * FROM admin_settings WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return sendError(res, 'Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const admin = result.rows[0];
    const validPassword = await bcrypt.compare(password, admin.password_hash);

    if (!validPassword) {
      return sendError(res, 'Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    await pool.query(
      'UPDATE admin_settings SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [admin.id]
    );

    sendSuccess(res, {
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        full_name: admin.full_name
      }
    }, 'Login successful', 200);

  } catch (error) {
    next(error);
  }
});

module.exports = router;
