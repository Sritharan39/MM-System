const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function initializeDatabase() {
  try {
    console.log('🚀 Starting database initialization...\n');

    // Create admin user
    console.log('📝 Creating default admin user...');
    const hashedPassword = require('bcryptjs').hashSync('admin123', 10);
    
    await pool.query(
      `INSERT INTO admin_settings (username, email, password_hash, full_name) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (username) DO NOTHING`,
      ['admin', 'admin@mess.local', hashedPassword, 'Admin User']
    );
    console.log('✅ Admin user created (Username: admin, Password: admin123)\n');

    // Create meal slots
    console.log('📝 Creating meal slots...');
    const slots = [
      { slot_name: 'Breakfast', slot_time: '08:00 AM' },
      { slot_name: 'Lunch', slot_time: '12:30 PM' },
      { slot_name: 'Dinner', slot_time: '07:00 PM' }
    ];

    for (const slot of slots) {
      await pool.query(
        `INSERT INTO meal_slots (slot_name, slot_time) 
         VALUES ($1, $2) 
         ON CONFLICT (slot_name) DO NOTHING`,
        [slot.slot_name, slot.slot_time]
      );
    }
    console.log('✅ Meal slots configured: 3 slots\n');

    // Create sample member
    console.log('📝 Creating sample member...');
    await pool.query(
      `INSERT INTO members (full_name, mobile_number, email, joining_date, status) 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (mobile_number) DO NOTHING`,
      ['Sample Member', '9876543210', 'sample@example.com', new Date(), 'Active']
    );
    console.log('✅ Sample member created\n');

    // Create sample meal plan
    console.log('📝 Creating sample meal plan...');
    const memberResult = await pool.query('SELECT id FROM members LIMIT 1');
    if (memberResult.rows.length > 0) {
      const memberId = memberResult.rows[0].id;
      await pool.query(
        `INSERT INTO meal_plans (member_id, plan_type, start_date, end_date, status) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (member_id) DO NOTHING`,
        [memberId, 'Monthly', new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'Active']
      );
      console.log('✅ Sample meal plan created\n');

      // Create sample payment
      console.log('📝 Creating sample payment...');
      await pool.query(
        `INSERT INTO payment_records (member_id, payment_amount, payment_date, payment_status) 
         VALUES ($1, $2, $3, $4)`,
        [memberId, 2500, new Date(), 'Paid']
      );
      console.log('✅ Sample payment record created\n');
    }

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║         DATABASE INITIALIZATION COMPLETED             ║');
    console.log('║ Admin Credentials:                                    ║');
    console.log('║   Username: admin                                     ║');
    console.log('║   Password: admin123                                  ║');
    console.log('║   ⚠️  CHANGE PASSWORD ON FIRST LOGIN!                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

initializeDatabase();