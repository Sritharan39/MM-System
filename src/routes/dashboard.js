const express = require('express');
const router = express.Router();
const dashboardService = require('../services/dashboardService');
const { sendSuccess, sendError } = require('../utils/responseHelper');

router.get('/', async (req, res, next) => {
  try {
    const data = await dashboardService.getDashboardData();
    sendSuccess(res, data, 'Dashboard data retrieved', 200);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
