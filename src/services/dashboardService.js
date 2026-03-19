const pool = require('../config/database');
const attendanceService = require('./attendanceService');
const mealPlanService = require('./mealPlanService');
const misuseService = require('./misuseService');

const getDashboardData = async () => {
  const membersResult = await pool.query(
    'SELECT COUNT(*) as total FROM members WHERE is_active = true'
  );
  
  const todayAttendance = await attendanceService.getTodaysAttendance();
  const breakfastCount = todayAttendance.filter(a => a.slot_name === 'Breakfast' && a.status === 'Present').length;
  const lunchCount = todayAttendance.filter(a => a.slot_name === 'Lunch' && a.status === 'Present').length;
  const dinnerCount = todayAttendance.filter(a => a.slot_name === 'Dinner' && a.status === 'Present').length;
  
  const expiringPlans = await mealPlanService.getExpiringPlans();
  const expiredPlans = await mealPlanService.getExpiredPlans();
  const todayMisuse = await misuseService.getTodaysMisuseFlags();
  
  const pendingPaymentsResult = await pool.query(
    `SELECT COUNT(*) as total FROM payment_records WHERE payment_status = 'Due'`
  );
  
  return {
    statistics: {
      total_active_members: parseInt(membersResult.rows[0].total),
      pending_payments: parseInt(pendingPaymentsResult.rows[0].total),
      plans_expiring_soon: expiringPlans.length,
      expired_plans: expiredPlans.length
    },
    today: {
      attendance: { breakfast: breakfastCount, lunch: lunchCount, dinner: dinnerCount },
      misuse_flags: todayMisuse.length
    },
    alerts: {
      expiring_members: expiringPlans,
      open_misuse_flags: await misuseService.getOpenMisuseFlags()
    }
  };
};

module.exports = { getDashboardData };
