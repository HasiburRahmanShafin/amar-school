const mongoose = require('mongoose');

// One subscription record per school. This is the source of truth for
// what plan a school is on, when it renews, and whether a downgrade is
// scheduled - School.subscriptionPlan is kept in sync as a convenience
// field for anything that just needs a quick read of the current plan.
const subscriptionSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, unique: true, index: true },

    plan: { type: String, enum: ['free', 'standard', 'premium'], default: 'free' },
    billingCycle: { type: String, enum: ['monthly'], default: 'monthly' },

    // 'active'   - plan is in good standing (free plans are always active)
    // 'past_due' - a paid plan's renewal date has passed and payment hasn't
    //              gone through yet; still has access during the grace period
    // 'cancelled'- reserved for a future explicit-cancel flow
    status: { type: String, enum: ['active', 'past_due', 'cancelled'], default: 'active' },

    // Null for the free plan. For paid plans, the date the next payment is
    // due; once paid this is pushed forward by one billing cycle.
    renewalDate: { type: Date, default: null },

    // A downgrade never applies immediately - it's scheduled to take effect
    // at the next billing cycle so the school keeps what it already paid for.
    scheduledDowngradeTo: { type: String, enum: ['free', 'standard', 'premium', null], default: null },
    scheduledDowngradeEffectiveDate: { type: Date, default: null },

    // Outcome of the most recent payment attempt, surfaced in the UI so an
    // admin immediately sees whether they need to take action.
    lastPaymentStatus: { type: String, enum: ['success', 'failed', 'pending', null], default: null },
    lastPaymentAt: { type: Date, default: null },

    // Points at the Invoice currently awaiting payment (upgrade in progress
    // or a manual renewal retry), if any.
    pendingInvoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },

    // Set once a past_due paid plan's grace period runs out and it's
    // auto-downgraded to Free, so the admin can see why they lost access.
    autoDowngradedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
