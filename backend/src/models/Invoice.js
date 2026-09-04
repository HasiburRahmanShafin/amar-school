const mongoose = require('mongoose');

// One row per subscription payment attempt (upgrade or renewal). Successful
// ones make up the Billing History on the Subscription page; failed/pending
// ones are what powers the "payment failed, here's how to fix it" banner.
const invoiceSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },

    invoiceNumber: { type: String, required: true, unique: true },

    // The plan this invoice is paying for (i.e. the plan the school will be
    // on / stay on once this invoice is paid).
    plan: { type: String, enum: ['standard', 'premium'], required: true },
    billingCycle: { type: String, enum: ['monthly'], default: 'monthly' },

    amount: { type: Number, required: true },
    currency: { type: String, default: 'BDT' },

    status: { type: String, enum: ['pending', 'paid', 'failed', 'cancelled'], default: 'pending', index: true },

    // SSLCommerz identifiers - tranId is ours (generated before redirecting
    // to the gateway), valId is theirs (returned once payment succeeds and
    // is what we re-validate server-side against the Order Validation API).
    tranId: { type: String, required: true, unique: true },
    valId: { type: String, default: null },
    paymentMethod: { type: String, default: null }, // e.g. "Visa", "bKash", "Nagad"
    cardType: { type: String, default: null },

    // Raw gateway response for the successful/attempted transaction, kept
    // for audit trail and support/dispute lookups.
    gatewayResponse: { type: mongoose.Schema.Types.Mixed, default: null },

    periodStart: { type: Date, default: null },
    periodEnd: { type: Date, default: null },

    issuedAt: { type: Date, default: Date.now },
    paidAt: { type: Date, default: null },
    failureReason: { type: String, default: null },
  },
  { timestamps: true }
);

invoiceSchema.index({ school: 1, createdAt: -1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
