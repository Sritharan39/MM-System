const express = require('express');
const router = express.Router();
const renewalService = require('../services/renewalService');
const memberService = require('../services/memberService');
const smsService = require('../services/smsService');
const pool = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responseHelper');

router.get('/pending', async (req, res, next) => {
  try {
    const members = await renewalService.getMembersNeedingRenewal();
    sendSuccess(res, members, `Found ${members.length} members`, 200);
  } catch (error) {
    next(error);
  }
});

router.get('/expired', async (req, res, next) => {
  try {
    const members = await renewalService.getExpiredMembers();
    sendSuccess(res, members, `Found ${members.length} members`, 200);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { member_id, slot_ids, monthly_amount, payment_amount, payment_date, payment_method, notes } = req.body;
    if (!member_id || !slot_ids || !monthly_amount || !payment_amount) {
      return sendError(res, 'Required fields missing', 400, 'MISSING_FIELDS');
    }
    const member = await memberService.getMemberById(member_id);
    if (!member) return sendError(res, 'Member not found', 404, 'MEMBER_NOT_FOUND');
    const renewedPlan = await renewalService.renewMemberPlan(member.id, {
      slot_ids, monthly_amount, payment_amount, payment_date: payment_date || new Date().toISOString().split('T')[0],
      payment_method, notes
    });
    sendSuccess(res, renewedPlan, 'Plan renewed', 201);
  } catch (error) {
    next(error);
  }
});

router.post('/:memberId/send-alert', async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const member = await memberService.getMemberById(memberId);
    if (!member) return sendError(res, 'Member not found', 404, 'MEMBER_NOT_FOUND');
    const planResult = await pool.query(
      `SELECT plan_end_date FROM meal_plans 
       WHERE member_id = $1 AND is_active = true AND plan_end_date >= CURRENT_DATE LIMIT 1`,
      [member.id]
    );
    if (planResult.rows.length === 0) {
      return sendError(res, 'No active plan found', 404, 'NO_ACTIVE_PLAN');
    }
    const expiryDate = planResult.rows[0].plan_end_date;
    const smsResult = await smsService.sendRenewalAlertSMS(
      member.id, member.full_name, member.mobile_number, expiryDate
    );
    if (smsResult.success) {
      sendSuccess(res, smsResult, 'Alert SMS sent', 200);
    } else {
      sendError(res, 'Failed to send SMS', 500, 'SMS_SEND_FAILED');
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
