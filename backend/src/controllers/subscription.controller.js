const PDFDocument = require('pdfkit');
const School = require('../models/School');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');
const { sendEmail } = require('../services/email.service');
const sslcommerz = require('../services/sslcommerz.service');
const { PLAN_CATALOG, isValidPlan, isUpgrade, isDowngrade } = require('../utils/subscriptionPlans');

const GRACE_PERIOD_DAYS = 3;

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

// Finds this school's subscription, creating a default Free-plan one the
// first time it's touched (so every school "has" a subscription without a
// migration/backfill step being required).
const getOrCreateSubscription = async (schoolId) => {
  let subscription = await Subscription.findOne({ school: schoolId });
  if (!subscription) {
    subscription = await Subscription.create({ school: schoolId, plan: 'free', status: 'active' });
    await School.findByIdAndUpdate(schoolId, { subscriptionPlan: 'free' });
  }
  return subscription;
};

const addOneMonth = (date) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  return d;
};

const generateTranId = (schoolId) => `SUB-${schoolId}-${Date.now()}`;

const generateInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const count = await Invoice.countDocuments({ invoiceNumber: new RegExp(`^INV-${year}-`) });
  return `INV-${year}-${String(count + 1).padStart(5, '0')}`;
};

const callbackUrls = () => {
  const base = (process.env.SERVER_URL || 'http://localhost:5000').replace(/\/$/, '');
  return {
    success: `${base}/api/subscription/payment/success`,
    fail: `${base}/api/subscription/payment/fail`,
    cancel: `${base}/api/subscription/payment/cancel`,
    ipn: `${base}/api/subscription/payment/ipn`,
  };
};

const clientRedirect = (status, extra = '') => {
  const base = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/admin/subscription?payment=${status}${extra}`;
};

const serializeSubscription = (subscription) => ({
  plan: subscription.plan,
  planDetails: PLAN_CATALOG[subscription.plan],
  billingCycle: subscription.billingCycle,
  status: subscription.status,
  renewalDate: subscription.renewalDate,
  scheduledDowngradeTo: subscription.scheduledDowngradeTo,
  scheduledDowngradeEffectiveDate: subscription.scheduledDowngradeEffectiveDate,
  lastPaymentStatus: subscription.lastPaymentStatus,
  lastPaymentAt: subscription.lastPaymentAt,
  autoDowngradedAt: subscription.autoDowngradedAt,
  hasPendingInvoice: Boolean(subscription.pendingInvoice),
});

// Starts (or restarts) an SSLCommerz checkout session for a given target
// plan and returns { gatewayUrl }. Shared by both `upgradePlan` and the
// manual-renewal retry after a failed payment, since they're the same
// operation: "pay to be on plan X for one more billing cycle".
const startCheckout = async ({ school, subscription, targetPlan, req, res, next }) => {
  const planDetails = PLAN_CATALOG[targetPlan];
  const invoiceNumber = await generateInvoiceNumber();
  const tranId = generateTranId(school._id);

  const invoice = await Invoice.create({
    school: school._id,
    subscription: subscription._id,
    invoiceNumber,
    plan: targetPlan,
    billingCycle: 'monthly',
    amount: planDetails.price,
    currency: planDetails.currency,
    status: 'pending',
    tranId,
    periodStart: new Date(),
    periodEnd: addOneMonth(new Date()),
  });

  const admin = await User.findOne({ school: school._id, role: 'school_admin' });

  const gateway = await sslcommerz.initiatePayment({
    tranId,
    amount: planDetails.price,
    currency: planDetails.currency,
    productName: `${planDetails.name} plan - monthly subscription (${school.name})`,
    customer: {
      name: admin?.name || school.principalName || school.name,
      email: admin?.email || school.email,
      phone: school.phone,
      address: school.address,
    },
    callbackUrls: callbackUrls(),
  });

  if (!gateway.success) {
    invoice.status = 'failed';
    invoice.failureReason = gateway.message;
    await invoice.save();
    return res.status(502).json({ message: gateway.message });
  }

  subscription.pendingInvoice = invoice._id;
  subscription.lastPaymentStatus = 'pending';
  await subscription.save();

  res.json({
    message: 'Redirecting to SSLCommerz to complete payment.',
    gatewayUrl: gateway.gatewayUrl,
    invoiceNumber: invoice.invoiceNumber,
  });
};

// ---------------------------------------------------------------------
// Plan catalog + current subscription
// ---------------------------------------------------------------------

// @route GET /api/subscription/plans
// @access Protected - school_admin
const getPlans = async (req, res) => {
  res.json({ plans: Object.values(PLAN_CATALOG) });
};

// @route GET /api/subscription/my
// @access Protected - school_admin
// Returns the school's current plan, renewal date, and recent billing
// history in one call, so the Subscription page can render in one request.
const getMySubscription = async (req, res, next) => {
  try {
    const subscription = await getOrCreateSubscription(req.schoolId);

    const billingHistory = await Invoice.find({ school: req.schoolId })
      .sort('-createdAt')
      .limit(50)
      .select('-gatewayResponse');

    res.json({
      subscription: serializeSubscription(subscription),
      plans: Object.values(PLAN_CATALOG),
      billingHistory,
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------
// Upgrade / downgrade
// ---------------------------------------------------------------------

// @route POST /api/subscription/upgrade  { plan }
// @access Protected - school_admin
// Upgrades take effect immediately once payment clears - there's no reason
// to make a school wait for a billing cycle to unlock features it's already
// paying more for. Kicks off an SSLCommerz session; the plan itself is only
// switched once `handlePaymentSuccess` confirms the payment server-side.
const upgradePlan = async (req, res, next) => {
  try {
    const { plan } = req.body;
    if (!isValidPlan(plan) || plan === 'free') {
      return res.status(400).json({ message: 'plan must be "standard" or "premium"' });
    }

    const school = await School.findById(req.schoolId);
    if (!school) return res.status(404).json({ message: 'School not found' });

    const subscription = await getOrCreateSubscription(req.schoolId);

    if (!isUpgrade(subscription.plan, plan)) {
      return res.status(400).json({
        message: `You're already on ${PLAN_CATALOG[subscription.plan].name} or higher. Use the downgrade option instead.`,
      });
    }

    // A downgrade scheduled for the next cycle no longer makes sense once
    // the admin decides to upgrade instead - drop it.
    subscription.scheduledDowngradeTo = null;
    subscription.scheduledDowngradeEffectiveDate = null;
    await subscription.save();

    await startCheckout({ school, subscription, targetPlan: plan, req, res, next });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/subscription/downgrade  { plan }
// @access Protected - school_admin
// Downgrades never take effect immediately - the school already paid for
// the current cycle, so they keep their current plan's features until the
// next renewal date, at which point the scheduled downgrade job applies it.
const downgradePlan = async (req, res, next) => {
  try {
    const { plan } = req.body;
    if (!isValidPlan(plan)) {
      return res.status(400).json({ message: 'plan must be "free", "standard" or "premium"' });
    }

    const subscription = await getOrCreateSubscription(req.schoolId);

    if (!isDowngrade(subscription.plan, plan)) {
      return res.status(400).json({ message: 'That is not a lower plan than your current one.' });
    }

    const effectiveDate = subscription.renewalDate || new Date();

    subscription.scheduledDowngradeTo = plan;
    subscription.scheduledDowngradeEffectiveDate = effectiveDate;
    await subscription.save();

    const school = await School.findById(req.schoolId);
    const admin = await User.findOne({ school: req.schoolId, role: 'school_admin' });
    if (admin) {
      await sendEmail({
        to: admin.email,
        subject: `Downgrade scheduled: ${PLAN_CATALOG[plan].name} plan`,
        html:
          `<p>Hi ${admin.name},</p>` +
          `<p>Your school <strong>${school?.name}</strong> will move from ` +
          `<strong>${PLAN_CATALOG[subscription.plan].name}</strong> to <strong>${PLAN_CATALOG[plan].name}</strong> ` +
          `on <strong>${effectiveDate.toDateString()}</strong>, your next billing date. You'll keep full access to ` +
          `your current plan's features until then. You can cancel this scheduled change any time before that date.</p>`,
        category: 'subscription_downgrade_scheduled',
        school: req.schoolId,
      });
    }

    res.json({
      message: `Downgrade to ${PLAN_CATALOG[plan].name} scheduled for ${effectiveDate.toDateString()}.`,
      subscription: serializeSubscription(subscription),
    });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/subscription/downgrade/cancel
// @access Protected - school_admin
const cancelScheduledDowngrade = async (req, res, next) => {
  try {
    const subscription = await getOrCreateSubscription(req.schoolId);
    if (!subscription.scheduledDowngradeTo) {
      return res.status(400).json({ message: 'No downgrade is currently scheduled.' });
    }

    subscription.scheduledDowngradeTo = null;
    subscription.scheduledDowngradeEffectiveDate = null;
    await subscription.save();

    res.json({ message: 'Scheduled downgrade cancelled.', subscription: serializeSubscription(subscription) });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/subscription/renew
// @access Protected - school_admin
// Manual renewal / retry after a failed or past-due payment. Re-initiates
// checkout for whichever plan the school is currently on (or was trying to
// move to), so a failed payment never permanently locks a school out -
// they always have a clear, one-click way to try again.
const renewManually = async (req, res, next) => {
  try {
    const school = await School.findById(req.schoolId);
    if (!school) return res.status(404).json({ message: 'School not found' });

    const subscription = await getOrCreateSubscription(req.schoolId);
    if (subscription.plan === 'free') {
      return res.status(400).json({ message: 'The Free plan does not require renewal. Upgrade to a paid plan instead.' });
    }

    await startCheckout({ school, subscription, targetPlan: subscription.plan, req, res, next });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------
// SSLCommerz callbacks
// ---------------------------------------------------------------------

// @route POST /api/subscription/payment/success   (SSLCommerz redirect, public)
const handlePaymentSuccess = async (req, res) => {
  try {
    const { tran_id: tranId, val_id: valId } = req.body;
    const invoice = await Invoice.findOne({ tranId });
    if (!invoice) return res.redirect(clientRedirect('failed', '&reason=invoice_not_found'));

    // Never trust the redirect alone - re-validate server-to-server.
    const validation = await sslcommerz.validateTransaction(valId);
    if (!validation.valid) {
      invoice.status = 'failed';
      invoice.failureReason = 'Payment could not be validated with SSLCommerz';
      await invoice.save();
      return res.redirect(clientRedirect('failed', `&invoice=${invoice.invoiceNumber}`));
    }

    const data = validation.data || {};
    if (Number(data.amount) && Math.round(Number(data.amount)) !== Math.round(invoice.amount)) {
      invoice.status = 'failed';
      invoice.failureReason = 'Validated amount did not match the invoice amount';
      await invoice.save();
      return res.redirect(clientRedirect('failed', `&invoice=${invoice.invoiceNumber}`));
    }

    if (invoice.status !== 'paid') {
      invoice.status = 'paid';
      invoice.valId = valId;
      invoice.paymentMethod = data.card_brand || data.card_issuer || 'SSLCommerz';
      invoice.cardType = data.card_type || null;
      invoice.gatewayResponse = data;
      invoice.paidAt = new Date();
      await invoice.save();

      const subscription = await Subscription.findById(invoice.subscription);
      subscription.plan = invoice.plan;
      subscription.status = 'active';
      subscription.renewalDate = addOneMonth(new Date());
      subscription.lastPaymentStatus = 'success';
      subscription.lastPaymentAt = new Date();
      subscription.pendingInvoice = null;
      subscription.autoDowngradedAt = null;
      // Whatever was scheduled before is moot now that a fresh payment landed.
      subscription.scheduledDowngradeTo = null;
      subscription.scheduledDowngradeEffectiveDate = null;
      await subscription.save();

      await School.findByIdAndUpdate(invoice.school, { subscriptionPlan: invoice.plan });

      const admin = await User.findOne({ school: invoice.school, role: 'school_admin' });
      const school = await School.findById(invoice.school);
      if (admin) {
        await sendEmail({
          to: admin.email,
          subject: `Payment received - Invoice ${invoice.invoiceNumber}`,
          html:
            `<p>Hi ${admin.name},</p>` +
            `<p>Thanks! We've received your payment for the <strong>${PLAN_CATALOG[invoice.plan].name}</strong> plan.</p>` +
            `<p><strong>Invoice:</strong> ${invoice.invoiceNumber}<br/>` +
            `<strong>Amount:</strong> ${invoice.currency} ${invoice.amount.toLocaleString()}<br/>` +
            `<strong>Next renewal date:</strong> ${subscription.renewalDate.toDateString()}</p>` +
            `<p>Your school <strong>${school?.name}</strong> now has full access to everything in the ` +
            `${PLAN_CATALOG[invoice.plan].name} plan. You can download the full invoice any time from your ` +
            `Subscription page.</p>`,
          category: 'subscription_invoice',
          school: invoice.school,
        });
      }
    }

    res.redirect(clientRedirect('success', `&invoice=${invoice.invoiceNumber}`));
  } catch (error) {
    console.error('Subscription payment success handler failed:', error.message);
    res.redirect(clientRedirect('failed', '&reason=server_error'));
  }
};

// @route POST /api/subscription/payment/fail   (SSLCommerz redirect, public)
const handlePaymentFail = async (req, res) => {
  try {
    const { tran_id: tranId } = req.body;
    const invoice = await Invoice.findOne({ tranId });
    if (invoice && invoice.status === 'pending') {
      invoice.status = 'failed';
      invoice.failureReason = 'Payment failed at the gateway';
      await invoice.save();

      const subscription = await Subscription.findById(invoice.subscription);
      if (subscription) {
        subscription.lastPaymentStatus = 'failed';
        subscription.pendingInvoice = null;
        await subscription.save();
      }

      const admin = await User.findOne({ school: invoice.school, role: 'school_admin' });
      if (admin) {
        await sendEmail({
          to: admin.email,
          subject: `Payment failed - Invoice ${invoice.invoiceNumber}`,
          html:
            `<p>Hi ${admin.name},</p>` +
            `<p>Your payment of ${invoice.currency} ${invoice.amount.toLocaleString()} for the ` +
            `<strong>${PLAN_CATALOG[invoice.plan].name}</strong> plan did not go through, so your subscription ` +
            `hasn't changed - your current plan and access are unaffected.</p>` +
            `<p><strong>To retry:</strong> log in to your dashboard, go to Subscription, and click ` +
            `"Retry payment". If the problem continues, please check with your bank/mobile wallet provider ` +
            `or try a different payment method.</p>`,
          category: 'subscription_payment_failed',
          school: invoice.school,
        });
      }
    }
    res.redirect(clientRedirect('failed', invoice ? `&invoice=${invoice.invoiceNumber}` : ''));
  } catch (error) {
    console.error('Subscription payment fail handler failed:', error.message);
    res.redirect(clientRedirect('failed'));
  }
};

// @route POST /api/subscription/payment/cancel   (SSLCommerz redirect, public)
const handlePaymentCancel = async (req, res) => {
  try {
    const { tran_id: tranId } = req.body;
    const invoice = await Invoice.findOne({ tranId });
    if (invoice && invoice.status === 'pending') {
      invoice.status = 'cancelled';
      await invoice.save();

      const subscription = await Subscription.findById(invoice.subscription);
      if (subscription) {
        subscription.lastPaymentStatus = 'failed';
        subscription.pendingInvoice = null;
        await subscription.save();
      }
    }
    res.redirect(clientRedirect('cancelled', invoice ? `&invoice=${invoice.invoiceNumber}` : ''));
  } catch (error) {
    console.error('Subscription payment cancel handler failed:', error.message);
    res.redirect(clientRedirect('cancelled'));
  }
};

// @route POST /api/subscription/payment/ipn   (SSLCommerz server-to-server, public)
// Same validation/apply logic as the success redirect, but this is the
// channel that's actually reliable - browser redirects can be closed or
// dropped by the user before they land, the IPN is sent independently by
// SSLCommerz's servers. Idempotent: re-processing an already-paid invoice
// is a safe no-op.
const handleIpn = async (req, res) => {
  try {
    const { tran_id: tranId, val_id: valId, status } = req.body;
    const invoice = await Invoice.findOne({ tranId });
    if (!invoice) return res.status(200).send('OK');

    if (invoice.status === 'paid') return res.status(200).send('OK');

    if (status !== 'VALID' && status !== 'VALIDATED') {
      return res.status(200).send('OK');
    }

    const validation = await sslcommerz.validateTransaction(valId);
    if (!validation.valid) return res.status(200).send('OK');

    invoice.status = 'paid';
    invoice.valId = valId;
    invoice.gatewayResponse = validation.data;
    invoice.paidAt = new Date();
    await invoice.save();

    const subscription = await Subscription.findById(invoice.subscription);
    if (subscription && subscription.plan !== invoice.plan) {
      subscription.plan = invoice.plan;
      subscription.status = 'active';
      subscription.renewalDate = addOneMonth(new Date());
      subscription.lastPaymentStatus = 'success';
      subscription.lastPaymentAt = new Date();
      subscription.pendingInvoice = null;
      await subscription.save();
      await School.findByIdAndUpdate(invoice.school, { subscriptionPlan: invoice.plan });
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Subscription IPN handler failed:', error.message);
    res.status(200).send('OK');
  }
};

// ---------------------------------------------------------------------
// Billing history / invoices
// ---------------------------------------------------------------------

// @route GET /api/subscription/invoices
// @access Protected - school_admin
const getInvoices = async (req, res, next) => {
  try {
    const invoices = await Invoice.find({ school: req.schoolId }).sort('-createdAt').select('-gatewayResponse');
    res.json(invoices);
  } catch (error) {
    next(error);
  }
};

// @route GET /api/subscription/invoices/:id/pdf
// @access Protected - school_admin (own invoice only)
const downloadInvoicePdf = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, school: req.schoolId });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const school = await School.findById(req.schoolId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    doc.fontSize(20).text('Amar School', { align: 'left' });
    doc.fontSize(10).fillColor('#666').text('Subscription Invoice');
    doc.moveDown(1.5);

    doc.fillColor('#000').fontSize(14).text(`Invoice ${invoice.invoiceNumber}`);
    doc.fontSize(10).fillColor('#333');
    doc.text(`Billed to: ${school?.name || ''}`);
    doc.text(`Issued: ${invoice.issuedAt.toDateString()}`);
    if (invoice.paidAt) doc.text(`Paid: ${invoice.paidAt.toDateString()}`);
    doc.text(`Status: ${invoice.status.toUpperCase()}`);
    doc.moveDown();

    doc.fontSize(12).fillColor('#000').text('Description', 50, doc.y, { continued: true });
    doc.text('Amount', { align: 'right' });
    doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).stroke();
    doc.moveDown(0.5);

    doc.fontSize(10).fillColor('#333');
    doc.text(
      `${PLAN_CATALOG[invoice.plan]?.name || invoice.plan} plan - monthly subscription`,
      50,
      doc.y,
      { continued: true }
    );
    doc.text(`${invoice.currency} ${invoice.amount.toLocaleString()}`, { align: 'right' });
    doc.moveDown();

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(12).text('Total', 50, doc.y, { continued: true });
    doc.text(`${invoice.currency} ${invoice.amount.toLocaleString()}`, { align: 'right' });

    if (invoice.status === 'paid') {
      doc.moveDown(2);
      doc.fontSize(9).fillColor('#666');
      doc.text(`Transaction ref: ${invoice.tranId}`);
      if (invoice.valId) doc.text(`Validation ID: ${invoice.valId}`);
      if (invoice.paymentMethod) doc.text(`Payment method: ${invoice.paymentMethod}`);
    } else {
      doc.moveDown(2);
      doc.fontSize(9).fillColor('#dc2626').text(`This invoice is ${invoice.status} and has not been paid.`);
    }

    doc.end();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPlans,
  getMySubscription,
  upgradePlan,
  downgradePlan,
  cancelScheduledDowngrade,
  renewManually,
  handlePaymentSuccess,
  handlePaymentFail,
  handlePaymentCancel,
  handleIpn,
  getInvoices,
  downloadInvoicePdf,
  GRACE_PERIOD_DAYS,
};
