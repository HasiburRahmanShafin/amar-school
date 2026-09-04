import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import * as subscriptionApi from '../../api/subscriptionApi';

const money = (amount, currency = 'BDT') => `${currency} ${Number(amount || 0).toLocaleString()}`;

const STATUS_BADGE = {
  active: 'bg-green-100 text-green-700',
  past_due: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-slate-200 text-slate-700',
};

const INVOICE_BADGE = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-200 text-slate-700',
};

function PlanCard({ plan, isCurrent, isDark, onUpgrade, onDowngrade, busy }) {
  const border = isCurrent
    ? 'border-indigo-500 ring-2 ring-indigo-500/30'
    : isDark
    ? 'border-slate-700/60'
    : 'border-slate-200/80';

  return (
    <div className={`rounded-2xl border p-6 flex flex-col ${isDark ? 'bg-slate-800/60' : 'bg-white'} ${border}`}>
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
        {isCurrent && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-600 text-white">Current plan</span>}
      </div>
      <p className={`text-2xl font-bold mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
        {plan.price === 0 ? 'Free' : money(plan.price, plan.currency)}
        {plan.price > 0 && <span className={`text-sm font-normal ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>/month</span>}
      </p>
      <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{plan.tagline}</p>

      <ul className="mt-4 space-y-2 flex-1">
        {plan.features.map((f) => (
          <li key={f} className={`text-sm flex items-start gap-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            <span className="text-green-500 mt-0.5">✓</span> {f}
          </li>
        ))}
      </ul>

      <div className="mt-5">
        {plan.action === 'upgrade' && (
          <button
            onClick={() => onUpgrade(plan.key)}
            disabled={busy}
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold"
          >
            {busy ? 'Redirecting…' : `Upgrade to ${plan.name}`}
          </button>
        )}
        {plan.action === 'downgrade' && (
          <button
            onClick={() => onDowngrade(plan.key)}
            disabled={busy}
            className={`w-full py-2.5 rounded-lg border text-sm font-semibold disabled:opacity-60 ${
              isDark ? 'border-slate-600 text-slate-200 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Downgrade to {plan.name}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Subscription() {
  const { isDark } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [billingHistory, setBillingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [busyPlan, setBusyPlan] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const label = isDark ? 'text-slate-300' : 'text-slate-600';
  const card = isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200/80';

  const load = useCallback(() => {
    setLoading(true);
    return subscriptionApi
      .getMySubscription()
      .then((res) => {
        setSubscription(res.data.subscription);
        setPlans(res.data.plans);
        setBillingHistory(res.data.billingHistory || []);
      })
      .catch((err) => setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load subscription' }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Handle the redirect back from SSLCommerz (?payment=success|failed|cancelled)
  useEffect(() => {
    const payment = searchParams.get('payment');
    if (!payment) return;

    const texts = {
      success: { type: 'success', text: 'Payment received! Your plan has been updated.' },
      failed: { type: 'error', text: 'Payment failed. Your current plan is unaffected - you can retry any time.' },
      cancelled: { type: 'error', text: 'Payment was cancelled. Your current plan is unaffected.' },
    };
    if (texts[payment]) {
      setMessage(texts[payment]);
      load();
    }

    const next = new URLSearchParams(searchParams);
    next.delete('payment');
    next.delete('invoice');
    next.delete('reason');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpgrade = async (plan) => {
    setBusyPlan(plan);
    setMessage(null);
    try {
      const res = await subscriptionApi.upgradePlan(plan);
      window.location.href = res.data.gatewayUrl;
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Could not start checkout' });
      setBusyPlan(null);
    }
  };

  const handleDowngrade = async (plan) => {
    if (!window.confirm(`Schedule a downgrade to ${plan}? You'll keep your current plan's features until your next renewal date.`)) return;
    setBusyPlan(plan);
    setMessage(null);
    try {
      const res = await subscriptionApi.downgradePlan(plan);
      setMessage({ type: 'success', text: res.data.message });
      setSubscription(res.data.subscription);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Could not schedule downgrade' });
    } finally {
      setBusyPlan(null);
    }
  };

  const handleCancelDowngrade = async () => {
    setMessage(null);
    try {
      const res = await subscriptionApi.cancelScheduledDowngrade();
      setMessage({ type: 'success', text: res.data.message });
      setSubscription(res.data.subscription);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Could not cancel scheduled downgrade' });
    }
  };

  const handleRenew = async () => {
    setBusyPlan('renew');
    setMessage(null);
    try {
      const res = await subscriptionApi.renewManually();
      window.location.href = res.data.gatewayUrl;
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Could not start renewal checkout' });
      setBusyPlan(null);
    }
  };

  const handleDownloadInvoice = async (invoice) => {
    setDownloadingId(invoice._id);
    try {
      await subscriptionApi.downloadInvoicePdf(invoice._id, invoice.invoiceNumber);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to download invoice' });
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading || !subscription) {
    return (
      <AdminLayout>
        <p className={label}>Loading subscription…</p>
      </AdminLayout>
    );
  }

  const rank = { free: 0, standard: 1, premium: 2 };
  const decoratedPlans = plans.map((p) => ({
    ...p,
    action: rank[p.key] > rank[subscription.plan] ? 'upgrade' : rank[p.key] < rank[subscription.plan] ? 'downgrade' : null,
  }));

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Subscription</h1>
          <p className={`text-sm mt-1 ${label}`}>Manage your plan, billing, and payment history.</p>
        </div>

        {message && (
          <div
            className={`rounded-lg px-4 py-3 text-sm ${
              message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Current status */}
        <div className={`rounded-2xl border p-6 ${card}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className={`text-xs font-medium uppercase tracking-wide ${label}`}>Current plan</p>
              <div className="flex items-center gap-2 mt-1">
                <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{subscription.planDetails?.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[subscription.status] || ''}`}>
                  {subscription.status.replace('_', ' ')}
                </span>
              </div>
              {subscription.renewalDate && (
                <p className={`text-xs mt-1 ${label}`}>
                  {subscription.status === 'past_due' ? 'Was due' : 'Renews'} on{' '}
                  {new Date(subscription.renewalDate).toDateString()}
                </p>
              )}
              {subscription.autoDowngradedAt && (
                <p className="text-xs mt-1 text-yellow-600">
                  Auto-moved to Free on {new Date(subscription.autoDowngradedAt).toDateString()} after a missed payment.
                </p>
              )}
            </div>

            {subscription.status === 'past_due' && (
              <div className="text-right">
                <p className="text-xs text-yellow-600 mb-2 max-w-xs">
                  Your last payment didn't go through. Your features are still active during the grace period - renew now to avoid interruption.
                </p>
                <button
                  onClick={handleRenew}
                  disabled={busyPlan === 'renew'}
                  className="px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-semibold disabled:opacity-60"
                >
                  {busyPlan === 'renew' ? 'Redirecting…' : 'Retry payment'}
                </button>
              </div>
            )}
          </div>

          {subscription.scheduledDowngradeTo && (
            <div className="mt-4 rounded-lg bg-indigo-50 border border-indigo-200 p-3 flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-indigo-800">
                Scheduled to move to <strong>{subscription.scheduledDowngradeTo}</strong> on{' '}
                {new Date(subscription.scheduledDowngradeEffectiveDate).toDateString()}.
              </p>
              <button onClick={handleCancelDowngrade} className="text-xs font-medium text-indigo-700 underline">
                Cancel this change
              </button>
            </div>
          )}
        </div>

        {/* Plan cards */}
        <div>
          <h2 className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>Plans</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {decoratedPlans.map((plan) => (
              <PlanCard
                key={plan.key}
                plan={plan}
                isCurrent={plan.key === subscription.plan}
                isDark={isDark}
                onUpgrade={handleUpgrade}
                onDowngrade={handleDowngrade}
                busy={busyPlan === plan.key}
              />
            ))}
          </div>
        </div>

        {/* Billing history */}
        <div>
          <h2 className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>Billing History</h2>
          <div className={`rounded-2xl border overflow-hidden ${card}`}>
            {billingHistory.length === 0 ? (
              <p className={`p-5 text-sm ${label}`}>No invoices yet. Upgrade to a paid plan to see your billing history here.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className={isDark ? 'bg-slate-900/50' : 'bg-slate-50'}>
                  <tr className={`text-left ${label}`}>
                    <th className="px-4 py-2 font-medium">Invoice</th>
                    <th className="px-4 py-2 font-medium">Plan</th>
                    <th className="px-4 py-2 font-medium">Amount</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {billingHistory.map((inv) => (
                    <tr key={inv._id} className={`border-t ${isDark ? 'border-slate-700/60' : 'border-slate-100'}`}>
                      <td className={`px-4 py-2.5 font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{inv.invoiceNumber}</td>
                      <td className={`px-4 py-2.5 capitalize ${label}`}>{inv.plan}</td>
                      <td className={`px-4 py-2.5 ${label}`}>{money(inv.amount, inv.currency)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${INVOICE_BADGE[inv.status] || ''}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className={`px-4 py-2.5 ${label}`}>{new Date(inv.issuedAt).toLocaleDateString()}</td>
                      <td className="px-4 py-2.5 text-right">
                        {inv.status === 'paid' && (
                          <button
                            onClick={() => handleDownloadInvoice(inv)}
                            disabled={downloadingId === inv._id}
                            className="text-xs font-medium text-indigo-500 disabled:opacity-60"
                          >
                            {downloadingId === inv._id ? 'Downloading…' : 'Download PDF'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
