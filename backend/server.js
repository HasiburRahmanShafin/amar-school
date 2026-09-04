require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { startReminderJobs } = require('./src/jobs/reminders');
const { startSubscriptionJobs } = require('./src/jobs/subscriptionJobs');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Amar School backend running on port ${PORT}`);
  });
  // Daily exam/fee reminder emails - see src/jobs/reminders.js for the schedule.
  startReminderJobs();
  // Daily subscription renewal reminders/downgrades/expiry handling - see
  // src/jobs/subscriptionJobs.js for the schedule.
  startSubscriptionJobs();
};

startServer();
