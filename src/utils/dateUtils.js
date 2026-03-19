const isExpiringWithin3Days = (planEndDate) => {
  const today = new Date();
  const endDate = new Date(planEndDate);
  const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
  return daysLeft <= 3 && daysLeft > 0;
};

const isPlanExpired = (planEndDate) => {
  const today = new Date();
  const endDate = new Date(planEndDate);
  return endDate < today;
};

const getMonthDateRange = (date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);
  return { startDate, endDate };
};

const getNextMonthRenewalDate = (currentPlanEndDate) => {
  const endDate = new Date(currentPlanEndDate);
  return new Date(endDate.getFullYear(), endDate.getMonth() + 1, endDate.getDate());
};

module.exports = {
  isExpiringWithin3Days,
  isPlanExpired,
  getMonthDateRange,
  getNextMonthRenewalDate
};
