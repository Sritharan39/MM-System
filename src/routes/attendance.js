const express = require('express');
const router = express.Router();
const attendanceService = require('../services/attendanceService');
const memberService = require('../services/memberService');
const { sendSuccess, sendError } = require('../utils/responseHelper');

router.get('/today', async (req, res, next) => {
  try {
    const attendance = await attendanceService.getTodaysAttendance();
    sendSuccess(res, attendance, `Retrieved ${attendance.length} records`, 200);
  } catch (error) {
    next(error);
  }
});

router.get('/date/:date', async (req, res, next) => {
  try {
    const { date } = req.params;
    const attendance = await attendanceService.getAttendanceByDate(date);
    sendSuccess(res, attendance, `Retrieved ${attendance.length} records`, 200);
  } catch (error) {
    next(error);
  }
});

router.get('/member/:memberId', async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const { startDate, endDate } = req.query;
    const member = await memberService.getMemberById(memberId);
    if (!member) return sendError(res, 'Member not found', 404, 'MEMBER_NOT_FOUND');
    const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];
    const attendance = await attendanceService.getMemberAttendance(member.id, start, end);
    sendSuccess(res, attendance, `Retrieved ${attendance.length} records`, 200);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { member_id, slot_id, attendance_date, status, remarks } = req.body;
    if (!member_id || !slot_id || !attendance_date || !status) {
      return sendError(res, 'All fields required', 400, 'MISSING_FIELDS');
    }
    const member = await memberService.getMemberById(member_id);
    if (!member) return sendError(res, 'Member not found', 404, 'MEMBER_NOT_FOUND');
    const record = await attendanceService.markAttendance({ member_id: member.id, slot_id, attendance_date, status, remarks });
    sendSuccess(res, record, 'Attendance marked', 201);
  } catch (error) {
    next(error);
  }
});

router.get('/summary/:memberId', async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const member = await memberService.getMemberById(memberId);
    if (!member) return sendError(res, 'Member not found', 404, 'MEMBER_NOT_FOUND');
    const summary = await attendanceService.getMemberMonthlySummary(member.id);
    sendSuccess(res, summary, 'Monthly summary', 200);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
