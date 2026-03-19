const pool = require('../config/database');

const flagMisuse = async (misuseData) => {
  const { member_id, reason, severity, notes } = misuseData;
  const result = await pool.query(
    `INSERT INTO misuse_flags (member_id, incident_date, reason, severity, status)
     VALUES ($1, CURRENT_TIMESTAMP, $2, $3, 'Open') RETURNING *`,
    [member_id, reason, severity || 'Low']
  );
  return result.rows[0];
};

const getMemberMisuseFlags = async (memberId) => {
  const result = await pool.query(
    `SELECT mf.*, m.full_name FROM misuse_flags mf
     JOIN members m ON m.id = mf.member_id
     WHERE mf.member_id = $1 ORDER BY mf.incident_date DESC`,
    [memberId]
  );
  return result.rows;
};

const getOpenMisuseFlags = async () => {
  const result = await pool.query(
    `SELECT mf.*, m.full_name, m.member_id FROM misuse_flags mf
     JOIN members m ON m.id = mf.member_id
     WHERE mf.status = 'Open' ORDER BY mf.incident_date DESC`
  );
  return result.rows;
};

const getTodaysMisuseFlags = async () => {
  const result = await pool.query(
    `SELECT mf.*, m.full_name, m.member_id FROM misuse_flags mf
     JOIN members m ON m.id = mf.member_id
     WHERE DATE(mf.incident_date) = CURRENT_DATE ORDER BY mf.incident_date DESC`
  );
  return result.rows;
};

const resolveMisuse = async (flagId, resolutionNotes) => {
  const result = await pool.query(
    `UPDATE misuse_flags
     SET status = 'Resolved', resolution_notes = $1, resolved_date = CURRENT_TIMESTAMP
     WHERE id = $2 RETURNING *`,
    [resolutionNotes, flagId]
  );
  return result.rows[0];
};

module.exports = {
  flagMisuse, getMemberMisuseFlags, getOpenMisuseFlags, getTodaysMisuseFlags, resolveMisuse
};
