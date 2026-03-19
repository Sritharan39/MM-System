const express = require('express');
const router = express.Router();
const misuseService = require('../services/misuseService');
const memberService = require('../services/memberService');
const { sendSuccess, sendError } = require('../utils/responseHelper');

router.get('/', async (req, res, next) => {
  try {
    const flags = await misuseService.getOpenMisuseFlags();
    sendSuccess(res, flags, `Found ${flags.length} flags`, 200);
  } catch (error) {
    next(error);
  }
});

router.get('/today', async (req, res, next) => {
  try {
    const flags = await misuseService.getTodaysMisuseFlags();
    sendSuccess(res, flags, `Found ${flags.length} flags`, 200);
  } catch (error) {
    next(error);
  }
});

router.get('/member/:memberId', async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const member = await memberService.getMemberById(memberId);
    if (!member) return sendError(res, 'Member not found', 404, 'MEMBER_NOT_FOUND');
    const flags = await misuseService.getMemberMisuseFlags(member.id);
    sendSuccess(res, flags, `Found ${flags.length} flags`, 200);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { member_id, reason, severity, notes } = req.body;
    if (!member_id || !reason) return sendError(res, 'Fields required', 400, 'MISSING_FIELDS');
    const member = await memberService.getMemberById(member_id);
    if (!member) return sendError(res, 'Member not found', 404, 'MEMBER_NOT_FOUND');
    const flag = await misuseService.flagMisuse({ member_id: member.id, reason, severity, notes });
    sendSuccess(res, flag, 'Misuse flag created', 201);
  } catch (error) {
    next(error);
  }
});

router.put('/:flagId/resolve', async (req, res, next) => {
  try {
    const { flagId } = req.params;
    const { resolution_notes } = req.body;
    const resolved = await misuseService.resolveMisuse(flagId, resolution_notes);
    sendSuccess(res, resolved, 'Flag resolved', 200);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
