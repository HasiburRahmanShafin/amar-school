// Single source of truth for subscription plan pricing, ranking, and the
// feature list shown to school admins on the Subscription page. Ranking is
// used to tell an "upgrade" apart from a "downgrade" (and to reject a
// same-plan change) without hardcoding plan order all over the controller.

const PLAN_RANK = { free: 0, standard: 1, premium: 2 };

// Monthly price in BDT. Free is, well, free.
const PLAN_CATALOG = {
  free: {
    key: 'free',
    name: 'Free',
    price: 0,
    currency: 'BDT',
    billingCycle: 'monthly',
    tagline: 'Get started with the essentials',
    features: [
      'Up to 100 students',
      'Student & teacher management',
      'Notices, routines & admission management',
      'Public school website',
    ],
  },
  standard: {
    key: 'standard',
    name: 'Standard',
    price: 1500,
    currency: 'BDT',
    billingCycle: 'monthly',
    tagline: 'For growing schools that need day-to-day operations covered',
    features: [
      'Everything in Free',
      'Attendance tracking',
      'Fee collection & manual transactions',
      'Exam & result management',
      'Email notifications & reminders',
    ],
  },
  premium: {
    key: 'premium',
    name: 'Premium',
    price: 3500,
    currency: 'BDT',
    billingCycle: 'monthly',
    tagline: 'Unlock online payments and deeper insight into your school',
    features: [
      'Everything in Standard',
      'Online fee payment via SSLCommerz',
      'Advanced analytics dashboard',
      'Unlimited students',
      'Priority support',
    ],
  },
};

const isValidPlan = (plan) => Object.prototype.hasOwnProperty.call(PLAN_CATALOG, plan);

const isUpgrade = (fromPlan, toPlan) => PLAN_RANK[toPlan] > PLAN_RANK[fromPlan];
const isDowngrade = (fromPlan, toPlan) => PLAN_RANK[toPlan] < PLAN_RANK[fromPlan];

module.exports = { PLAN_CATALOG, PLAN_RANK, isValidPlan, isUpgrade, isDowngrade };
