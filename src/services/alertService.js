const renewalService = require('./renewalService');
const smsService = require('./smsService');
const pool = require('../config/database');

const sendDailyRenewalAlerts = async () => {
  console.log('🔔 Running daily renewal alerts...');
  
  try {
    const membersToAlert = await renewalService.getMembersNeedingRenewal();
    
    for (const member of membersToAlert) {
      const sentToday = await pool.query(
        `SELECT id FROM sms_logs 
         WHERE member_id = $1 AND message_type = 'Renewal_Alert'
         AND DATE(sent_at) = CURRENT_DATE LIMIT 1`,
        [member.id]
      );
      
      if (sentToday.rows.length === 0) {
        await smsService.sendRenewalAlertSMS(
          member.id, member.full_name, member.mobile_number, member.plan_end_date
        );
        console.log(`✅ Alert sent to ${member.full_name}`);
      }
    }
    
    console.log(`✅ Daily alerts completed. ${membersToAlert.length} members alerted.`);
  } catch (error) {
    console.error('❌ Error sending alerts:', error);
  }
};

const setupDailyAlerts = () => {
  const schedule = require('node-schedule');
  schedule.scheduleJob('0 8 * * *', () => {
    sendDailyRenewalAlerts();
  });
  console.log('📅 Daily renewal alert job scheduled for 8:00 AM');
};

module.exports = { sendDailyRenewalAlerts, setupDailyAlerts };
