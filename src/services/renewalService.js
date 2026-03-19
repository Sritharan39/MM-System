const pool = require('../config/database');
const paymentService = require('./paymentService');

const renewMemberPlan = async (memberId, renewalData) => {
  const { slot_ids, monthly_amount, payment_amount, payment_date, payment_method, notes } = renewalData;
  
  const planResult = await pool.query(
    `SELECT mp.* FROM meal_plans mp WHERE mp.member_id = $1 AND mp.is_active = true 
     AND mp.plan_end_date >= CURRENT_DATE LIMIT 1`,
    [memberId]
  );
  
  const currentPlan = planResult.rows[0];
  const newPlanStartDate = new Date(currentPlan.plan_end_date);
  newPlanStartDate.setDate(newPlanStartDate.getDate() + 1);
  
  const newPlanEndDate = new Date(newPlanStartDate);
  newPlanEndDate.setMonth(newPlanEndDate.getMonth() + 1);
  newPlanEndDate.setDate(newPlanEndDate.getDate() - 1);
  
  const newPlanResult = await pool.query(
    `INSERT INTO meal_plans (member_id, slot_ids, monthly_amount, plan_start_date, plan_end_date, is_active)
     VALUES ($1, $2, $3, $4, $5, true) RETURNING *`,
    [memberId, slot_ids.join(','), monthly_amount, 
     newPlanStartDate.toISOString().split('T')[0],
     newPlanEndDate.toISOString().split('T')[0]]
  );
  
  const newPlan = newPlanResult.rows[0];
  
  await paymentService.recordPayment({
    member_id: memberId, plan_id: newPlan.id, payment_amount, payment_date,
    payment_month: newPlanStartDate, payment_status: 'Paid',
    payment_method: payment_method || 'Cash', notes: notes || 'Plan renewal'
  });
  
  return newPlan;
};

const getMembersNeedingRenewal = async () => {
  const result = await pool.query(
    `SELECT m.*, mp.plan_end_date FROM members m
     JOIN meal_plans mp ON mp.member_id = m.id
     WHERE mp.is_active = true AND mp.plan_end_date BETWEEN CURRENT_DATE 
     AND CURRENT_DATE + INTERVAL '3 days' AND m.is_active = true
     ORDER BY mp.plan_end_date ASC`
  );
  return result.rows;
};

const getExpiredMembers = async () => {
  const result = await pool.query(
    `SELECT m.*, mp.plan_end_date FROM members m
     JOIN meal_plans mp ON mp.member_id = m.id
     WHERE mp.is_active = true AND mp.plan_end_date < CURRENT_DATE AND m.is_active = true
     ORDER BY mp.plan_end_date ASC`
  );
  return result.rows;
};

module.exports = { renewMemberPlan, getMembersNeedingRenewal, getExpiredMembers };
