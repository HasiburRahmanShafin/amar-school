const cron = require('node-cron');
const School = require('../models/School');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { sendEmail } = require('../services/email.service');
const { PLAN_CATALOG } = require('../utils/subscriptionPlans');

// Paid plans that stay past_due this many days past their renewal date get
// auto-downgraded to Free rather than being locked out entirely - "the
// platform ensures uninterrupted service" even when a payment lapses.
const GRACE_PERIOD_DAYS = 3;
// How many days ahead of renewal to warn the admin, so they get more than
// one nudge as the date approaches.
const REMINDER_WINDOWS_DAYS = [7, 3, 1];

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const daysFromNow = (n) => {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() + n);
  return d;
};

const getAdminEmail = async (schoolId) => {
  const admin = await User.findOne({ school: schoolId, role: 'school_admin' }).select('name email');
  return admin;
};

// ---------------------------------------------------------------------
// 1. Upcoming-renewal reminders for active paid subscriptions
// ---------------------------------------------------------------------

const sendRenewalReminders = async () => {
  for (const daysLeft of REMINDER_WINDOWS_DAYS) {
    const targetDay = daysFromNow(daysLeft);
    const nextDay = daysFromNow(daysLeft + 1);

    const dueSoon = await Subscription.find({
      plan: { $ne: 'free' },
      status: 'active',
      renewalDate: { $gte: targetDay, $lt: nextDay },
    });

    await Promise.all(
      dueSoon.map(async (subscription) => {
        const admin = await getAdminEmail(subscription.school);
        if (!admin) return;
        const school = await School.findById(subscription.school).select('name');

        return sendEmail({
          to: admin.email,
          subject: `Your ${PLAN_CATALOG[subscription.plan].name} plan renews in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`,
          html:
            `<p>Hi ${admin.name},</p>` +
            `<p>Your subscription for <strong>${school?.name || 'your school'}</strong> on the ` +
            `<strong>${PLAN_CATALOG[subscription.plan].name}</strong> plan ` +
            `(${subscription.currency || 'BDT'} ${PLAN_CATALOG[subscription.plan].price.toLocaleString()}/month) ` +
            `renews on <strong>${subscription.renewalDate.toDateString()}</strong>.</p>` +
            `<p>No action is needed if your payment goes through automatically at that time. If you'd like to pay ` +
            `now or update your plan, visit the Subscription page in your dashboard.</p>`,
          category: 'subscription_renewal_reminder',
          school: subscription.school,
          dedupeKey: `subscription_reminder:${subscription._id}:${subscription.renewalDate.toISOString().slice(0, 10)}:${daysLeft}`,
        });
      })
    );
  }
};

// ---------------------------------------------------------------------
// 2. Apply scheduled downgrades once their effective date arrives
// ---------------------------------------------------------------------

const applyScheduledDowngrades = async () => {
  const today = startOfDay(new Date());

  const due = await Subscription.find({
    scheduledDowngradeTo: { $ne: null },
    scheduledDowngradeEffectiveDate: { $lte: today },
  });

  for (const subscription of due) {
    const newPlan = subscription.scheduledDowngradeTo;
    const oldPlan = subscription.plan;

    subscription.plan = newPlan;
    subscription.scheduledDowngradeTo = null;
    subscription.scheduledDowngradeEffectiveDate = null;
    subscription.renewalDate = newPlan === 'free' ? null : addOneMonth(today);
    subscription.status = 'active';
    await subscription.save();

    await School.findByIdAndUpdate(subscription.school, { subscriptionPlan: newPlan });

    const admin = await getAdminEmail(subscription.school);
    const school = await School.findById(subscription.school).select('name');
    if (admin) {
      await sendEmail({
        to: admin.email,
        subject: `Your plan is now ${PLAN_CATALOG[newPlan].name}`,
        html:
          `<p>Hi ${admin.name},</p>` +
          `<p>As scheduled, <strong>${school?.name || 'your school'}</strong> has moved from ` +
          `<strong>${PLAN_CATALOG[oldPlan].name}</strong> to <strong>${PLAN_CATALOG[newPlan].name}</strong>. ` +
          `${newPlan === 'free' ? 'Paid features have been switched off - upgrade any time to bring them back.' : `Your next renewal date is ${subscription.renewalDate.toDateString()}.`}</p>`,
        category: 'subscription_downgrade_applied',
        school: subscription.school,
        dedupeKey: `subscription_downgrade_applied:${subscription._id}:${today.toISOString().slice(0, 10)}`,
      });
    }
  }
};

const addOneMonth = (date) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  return d;
};

// ---------------------------------------------------------------------
// 3. Handle lapsed paid subscriptions: past_due, then grace-period downgrade
// ---------------------------------------------------------------------

const handleLapsedSubscriptions = async () => {
  const today = startOfDay(new Date());

  // Renewal date has passed and payment hasn't come in yet - flag as
  // past_due (school keeps access during the grace period) and send clear
  // manual-renewal instructions.
  const newlyOverdue = await Subscription.find({
    plan: { $ne: 'free' },
    status: 'active',
    renewalDate: { $lt: today },
  });

  for (const subscription of newlyOverdue) {
    subscription.status = 'past_due';
    subscription.lastPaymentStatus = 'failed';
    await subscription.save();

    const admin = await getAdminEmail(subscription.school);
    const school = await School.findById(subscription.school).select('name');
    if (admin) {
      await sendEmail({
        to: admin.email,
        subject: `Action needed: renew your ${PLAN_CATALOG[subscription.plan].name} plan`,
        html:
          `<p>Hi ${admin.name},</p>` +
          `<p>We weren't able to automatically renew <strong>${school?.name || 'your school'}</strong>'s ` +
          `<strong>${PLAN_CATALOG[subscription.plan].name}</strong> plan, which was due on ` +
          `<strong>${subscription.renewalDate.toDateString()}</strong>.</p>` +
          `<p>Your features are still active for now. To keep them, please renew manually within the next ` +
          `${GRACE_PERIOD_DAYS} days:</p>` +
          `<ol>` +
          `<li>Log in to your dashboard</li>` +
          `<li>Go to <strong>Subscription</strong></li>` +
          `<li>Click <strong>"Retry payment"</strong> and complete checkout via SSLCommerz</li>` +
          `</ol>` +
          `<p>If we still don't receive payment after ${GRACE_PERIOD_DAYS} days, your school will automatically ` +
          `move to the Free plan (no data is lost, and you can upgrade again any time).</p>`,
        category: 'subscription_past_due',
        school: subscription.school,
        dedupeKey: `subscription_past_due:${subscription._id}:${subscription.renewalDate.toISOString().slice(0, 10)}`,
      });
    }
  }

  // Past the grace period with no payment - gracefully fall back to Free
  // rather than cutting the school off entirely.
  const gracePeriodCutoff = new Date(today);
  gracePeriodCutoff.setDate(gracePeriodCutoff.getDate() - GRACE_PERIOD_DAYS);

  const expired = await Subscription.find({
    plan: { $ne: 'free' },
    status: 'past_due',
    renewalDate: { $lt: gracePeriodCutoff },
  });

  for (const subscription of expired) {
    const oldPlan = subscription.plan;
    subscription.plan = 'free';
    subscription.status = 'active';
    subscription.renewalDate = null;
    subscription.autoDowngradedAt = new Date();
    subscription.scheduledDowngradeTo = null;
    subscription.scheduledDowngradeEffectiveDate = null;
    await subscription.save();

    await School.findByIdAndUpdate(subscription.school, { subscriptionPlan: 'free' });

    const admin = await getAdminEmail(subscription.school);
    const school = await School.findById(subscription.school).select('name');
    if (admin) {
      await sendEmail({
        to: admin.email,
        subject: `Your school has been moved to the Free plan`,
        html:
          `<p>Hi ${admin.name},</p>` +
          `<p>We didn't receive payment for <strong>${school?.name || 'your school'}</strong>'s ` +
          `<strong>${PLAN_CATALOG[oldPlan].name}</strong> plan within the grace period, so it has been switched ` +
          `to the <strong>Free</strong> plan. Nothing has been deleted - all your data is safe, and you can ` +
          `upgrade again at any time from the Subscription page.</p>`,
        category: 'subscription_auto_downgraded',
        school: subscription.school,
        dedupeKey: `subscription_auto_downgraded:${subscription._id}`,
      });
    }
  }
};

const runSubscriptionJobs = async () => {
  try {
    await sendRenewalReminders();
  } catch (error) {
    console.error('Subscription renewal reminder job failed:', error.message);
  }

  try {
    await applyScheduledDowngrades();
  } catch (error) {
    console.error('Scheduled downgrade job failed:', error.message);
  }

  try {
    await handleLapsedSubscriptions();
  } catch (error) {
    console.error('Lapsed subscription job failed:', error.message);
  }
};

// Runs once a day at 07:30 server time, ahead of the 08:00 exam/fee
// reminder job in jobs/reminders.js.
const startSubscriptionJobs = () => {
  cron.schedule('30 7 * * *', runSubscriptionJobs);
};

module.exports = { startSubscriptionJobs, runSubscriptionJobs };
