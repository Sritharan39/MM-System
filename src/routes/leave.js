const express = require('express');
const router = express.Router();
const leaveService = require('../services/leaveService');
const memberService = require('../services/memberService');
const { sendSuccess, sendError } = require('../utils/responseHelper');

router.get('/member/:memberId', async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const member = await memberService.getMemberById(memberId);
    if (!member) return sendError(res, 'Member not found', 404, 'MEMBER_NOT_FOUND');
    const leaves = await leaveService.getMemberLeaves(member.id);
    sendSuccess(res, leaves, `Retrieved ${leaves.length} leaves`, 200);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { member_id, slot_id, leave_date, leave_reason } = req.body;
    if (!member_id || !slot_id || !leave_date) return sendError(res, 'Fields required', 400, 'MISSING_FIELDS');
    const member = await memberService.getMemberById(member_id);
    if (!member) return sendError(res, 'Member not found', 404, 'MEMBER_NOT_FOUND');
    const leave = await leaveService.markLeave({ member_id: member.id, slot_id, leave_date, leave_reason });
    sendSuccess(res, leave, 'Leave marked', 201);
  } catch (error) {
    next(error);
  }
});

router.delete('/:leaveId', async (req, res, next) => {
  try {
    const { leaveId } = req.params;
    const leave = await leaveService.getLeaveById(leaveId);
    if (!leave) return sendError(res, 'Leave not found', 404, 'LEAVE_NOT_FOUND');
    const cancelled = await leaveService.cancelLeave(leaveId);
    sendSuccess(res, cancelled, 'Leave cancelled', 200);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
