const twilio = require('twilio');
const pool = require('../config/database');
require('dotenv').config();

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const sendSMS = async (phoneNumber, message) => {
  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
    return { success: true, twilioSid: result.sid, status: result.status };
  } catch (error) {
    console.error('SMS send error:', error);
    return { success: false, error: error.message };
  }
};

const logSMS = async (memberId, phoneNumber, messageType, messageBody, status, twilioSid) => {
  try {
    const result = await pool.query(
      `INSERT INTO sms_logs (member_id, phone_number, message_type, message_body, status, twilio_sid, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) RETURNING *`,
      [memberId, phoneNumber, messageType, messageBody, status, twilioSid]
    );
    return result.rows[0];
  } catch (error) {
    console.error('SMS log error:', error);
    return null;
  }
};

const sendRenewalAlertSMS = async (memberId, memberName, phoneNumber, expiryDate) => {
  const restaurantName = process.env.RESTAURANT_NAME || 'Our Restaurant';
  const message = `Dear ${memberName}, your mess plan at ${restaurantName} is expiring on ${expiryDate}. Kindly visit us to renew your plan. Thank you!`;
  
  const smsResult = await sendSMS(phoneNumber, message);
  
  if (smsResult.success) {
    await logSMS(memberId, phoneNumber, 'Renewal_Alert', message, 'Sent', smsResult.twilioSid);
  } else {
    await logSMS(memberId, phoneNumber, 'Renewal_Alert', message, 'Failed', null);
  }
  
  return smsResult;
};

const sendCustomSMS = async (phoneNumber, message, memberId = null) => {
  const smsResult = await sendSMS(phoneNumber, message);
  if (memberId) {
    if (smsResult.success) {
      await logSMS(memberId, phoneNumber, 'Custom', message, 'Sent', smsResult.twilioSid);
    } else {
      await logSMS(memberId, phoneNumber, 'Custom', message, 'Failed', null);
    }
  }
  return smsResult;
};

const getSMSLogs = async (memberId) => {
  const result = await pool.query(
    'SELECT * FROM sms_logs WHERE member_id = $1 ORDER BY sent_at DESC',
    [memberId]
  );
  return result.rows;
};

module.exports = { sendSMS, sendRenewalAlertSMS, sendCustomSMS, logSMS, getSMSLogs };
