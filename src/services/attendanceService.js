const pool = require('../config/database');

const markAttendance = async (attendanceData) => {
  const { member_id, slot_id, attendance_date, status, remarks } = attendanceData;
  const result = await pool.query(
    `INSERT INTO attendance_records (member_id, slot_id, attendance_date, status, remarks, marked_by)
     VALUES ($1, $2, $3, $4, $5, 'admin')
     ON CONFLICT (member_id, slot_id, attendance_date) 
     DO UPDATE SET status = $4, remarks = $5 RETURNING *`,
    [member_id, slot_id, attendance_date, status, remarks]
  );
  return result.rows[0];
};

const getTodaysAttendance = async () => {
  const today = new Date().toISOString().split('T')[0];
  const result = await pool.query(
    `SELECT ar.*, m.full_name, m.member_id, ms.slot_name FROM attendance_records ar
     JOIN members m ON m.id = ar.member_id JOIN meal_slots ms ON ms.id = ar.slot_id
     WHERE ar.attendance_date = $1 ORDER BY ms.display_order, m.full_name`,
    [today]
  );
  return result.rows;
};

const getAttendanceByDate = async (date) => {
  const result = await pool.query(
    `SELECT ar.*, m.full_name, m.member_id, ms.slot_name FROM attendance_records ar
     JOIN members m ON m.id = ar.member_id JOIN meal_slots ms ON ms.id = ar.slot_id
     WHERE ar.attendance_date = $1 ORDER BY ms.display_order, m.full_name`,
    [date]
  );
  return result.rows;
};

const getMemberAttendance = async (memberId, startDate, endDate) => {
  const result = await pool.query(
    `SELECT ar.*, ms.slot_name FROM attendance_records ar
     JOIN meal_slots ms ON ms.id = ar.slot_id
     WHERE ar.member_id = $1 AND ar.attendance_date BETWEEN $2 AND $3
     ORDER BY ar.attendance_date DESC`,
    [memberId, startDate, endDate]
  );
  return result.rows;
};

const getMemberMonthlySummary = async (memberId) => {
  const result = await pool.query(
    `SELECT m.full_name, m.member_id, ms.slot_name,
     COUNT(CASE WHEN ar.status = 'Present' THEN 1 END) as meals_taken,
     COUNT(CASE WHEN ar.status = 'Absent' THEN 1 END) as meals_missed,
     COUNT(CASE WHEN ar.status = 'Leave' THEN 1 END) as leaves_taken
     FROM members m
     LEFT JOIN attendance_records ar ON m.id = ar.member_id
     LEFT JOIN meal_slots ms ON ms.id = ar.slot_id
     WHERE m.id = $1 AND DATE_TRUNC('month', ar.attendance_date) = DATE_TRUNC('month', CURRENT_DATE)
     GROUP BY m.full_name, m.member_id, ms.slot_name ORDER BY ms.display_order`,
    [memberId]
  );
  return result.rows;
};

module.exports = {
  markAttendance, getTodaysAttendance, getAttendanceByDate, getMemberAttendance, getMemberMonthlySummary
};
