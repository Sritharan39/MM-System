const pool = require('../config/database');

const markLeave = async (leaveData) => {
  const { member_id, slot_id, leave_date, leave_reason } = leaveData;
  const result = await pool.query(
    `INSERT INTO leave_records (member_id, slot_id, leave_date, leave_reason)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [member_id, slot_id, leave_date, leave_reason]
  );
  return result.rows[0];
};

const getMemberLeaves = async (memberId) => {
  const result = await pool.query(
    `SELECT lr.*, m.full_name, ms.slot_name FROM leave_records lr
     JOIN members m ON m.id = lr.member_id JOIN meal_slots ms ON ms.id = lr.slot_id
     WHERE lr.member_id = $1 ORDER BY lr.leave_date DESC`,
    [memberId]
  );
  return result.rows;
};

const cancelLeave = async (leaveId) => {
  const result = await pool.query(
    'DELETE FROM leave_records WHERE id = $1 RETURNING *',
    [leaveId]
  );
  return result.rows[0];
};

const getLeaveById = async (leaveId) => {
  const result = await pool.query(
    'SELECT * FROM leave_records WHERE id = $1',
    [leaveId]
  );
  return result.rows[0];
};

module.exports = { markLeave, getMemberLeaves, cancelLeave, getLeaveById };
