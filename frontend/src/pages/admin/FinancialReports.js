import { useEffect, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import * as financialApi from '../../api/financialApi';

/* ── constants ──────────────────────────────────────────────── */

const FEE_TYPES = [
  { value: '', label: 'All Fee Types' },
  { value: 'tuition', label: 'Tuition' },
  { value: 'exam', label: 'Exam' },
  { value: 'other', label: 'Other' },
];

const PAYMENT_METHODS = ['cash', 'bank', 'bkash', 'sslcommerz'];

const emptyFilters = { startDate: '', endDate: '', className: '', feeType: '' };

const emptyTxForm = {
  student: '',
  feeType: 'tuition',
  label: '',
  amount: '',
  paymentMethod: 'cash',
  transactionRef: '',
  academicYear: String(new Date().getFullYear()),
  paymentDate: new Date().toISOString().substring(0, 10),
};

const emptyFeeForm = {
  className: '',
  feeType: 'tuition',
  amount: '',
  label: '',
  academicYear: String(new Date().getFullYear()),
};

/* ── helpers ─────────────────────────────────────────────────── */

const money = (n) => `BDT ${Number(n || 0).toLocaleString()}`;

const activeOf = (filters) =>
  Object.fromEntries(Object.entries(filters).filter(([, v]) => v));

/* ── sub-components ──────────────────────────────────────────── */

function StatCard({ label, value, sub, color, isDark }) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200/80'
      }`}
    >
      <p className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        {label}
      </p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && (
        <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{sub}</p>
      )}
    </div>
  );
}

/* ── main component ─────────────────────────────────────────── */

export default function FinancialReports() {
  const { isDark } = useAuth();

  /* filter state */
  const [filters, setFilters] = useState(emptyFilters);

  /* data state */
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [feeStructures, setFeeStructures] = useState([]);

  /* ui state */
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null); // 'excel' | 'pdf' | null
  const [message, setMessage] = useState(null);

  /* record-payment modal */
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [txForm, setTxForm] = useState(emptyTxForm);
  const [txSaving, setTxSaving] = useState(false);

  /* fee structure panel */
  const [showFeePanel, setShowFeePanel] = useState(false);
  const [feeForm, setFeeForm] = useState(emptyFeeForm);
  const [feeSaving, setFeeSaving] = useState(false);

  /* ── data loading ───────────────────────────────────────── */

  const load = useCallback(
    (overrideFilters, overridePage) => {
      const f = activeOf(overrideFilters ?? filters);
      const p = overridePage ?? page;
      setLoading(true);
      setMessage(null);
      Promise.all([
        financialApi.getFinancialSummary(f),
        financialApi.getTransactions({ ...f, page: p }),
        financialApi.getFeeStructures(f.academicYear),
      ])
        .then(([sumRes, txRes, feeRes]) => {
          setSummary(sumRes.data);
          setTransactions(txRes.data.transactions);
          setPages(txRes.data.pages);
          setFeeStructures(feeRes.data);
        })
        .catch((err) =>
          setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load report' })
        )
        .finally(() => setLoading(false));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, page]
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  /* ── filter handlers ────────────────────────────────────── */

  const handleFilterChange = (field) => (e) =>
    setFilters((prev) => ({ ...prev, [field]: e.target.value }));

  const applyFilters = (e) => {
    e.preventDefault();
    setPage(1);
    load(filters, 1);
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    setPage(1);
    load(emptyFilters, 1); // ← immediately reload with empty filters
  };

  /* ── export handlers ────────────────────────────────────── */

  const handleExport = async (type) => {
    setExporting(type);
    setMessage(null);
    try {
      const f = activeOf(filters);
      if (type === 'excel') await financialApi.exportExcel(f);
      else await financialApi.exportPdf(f);
    } catch {
      setMessage({ type: 'error', text: 'Export failed. Please try again.' });
    } finally {
      setExporting(null);
    }
  };

  /* ── record payment handlers ────────────────────────────── */

  const handleTxChange = (field) => (e) =>
    setTxForm((prev) => ({ ...prev, [field]: e.target.value }));

  const submitTransaction = async (e) => {
    e.preventDefault();
    setTxSaving(true);
    setMessage(null);
    try {
      await financialApi.recordTransaction({
        ...txForm,
        amount: Number(txForm.amount),
      });
      setShowPaymentModal(false);
      setTxForm(emptyTxForm);
      setMessage({ type: 'success', text: 'Payment recorded successfully.' });
      load(filters, page);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to record payment.' });
    } finally {
      setTxSaving(false);
    }
  };

  /* ── fee structure handlers ─────────────────────────────── */

  const handleFeeChange = (field) => (e) =>
    setFeeForm((prev) => ({ ...prev, [field]: e.target.value }));

  const submitFeeStructure = async (e) => {
    e.preventDefault();
    setFeeSaving(true);
    setMessage(null);
    try {
      await financialApi.upsertFeeStructure({
        ...feeForm,
        amount: Number(feeForm.amount),
      });
      setFeeForm(emptyFeeForm);
      setMessage({ type: 'success', text: 'Fee structure saved.' });
      // Refresh fee structures list
      const res = await financialApi.getFeeStructures(feeForm.academicYear);
      setFeeStructures(res.data);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save fee structure.' });
    } finally {
      setFeeSaving(false);
    }
  };

  /* ── theme helpers ──────────────────────────────────────── */

  const card = isDark
    ? 'bg-slate-800/60 border-slate-700/60'
    : 'bg-white border-slate-200/80';
  const heading = isDark ? 'text-white' : 'text-slate-800';
  const subText = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputCls = `border rounded-xl px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
    isDark
      ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500'
      : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
  }`;
  const sectionTitle = isDark ? 'text-slate-300' : 'text-slate-600';
  const divider = isDark ? 'divide-slate-700/60' : 'divide-slate-100';
  const borderColor = isDark ? 'border-slate-700/60' : 'border-slate-200/80';

  /* ── render ─────────────────────────────────────────────── */

  return (
    <AdminLayout>
      {/* ── Page header ────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${heading}`}>Financial Reports</h1>
          <p className={`text-sm mt-0.5 ${subText}`}>
            Fee collection, pending dues &amp; revenue trends
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFeePanel((v) => !v)}
            className={`text-sm px-4 py-2.5 rounded-xl border transition-all duration-200 ${
              isDark
                ? 'border-slate-600 text-slate-200 hover:bg-slate-800'
                : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            ⚙️ Fee Structure
          </button>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="btn-primary text-sm px-5 py-2.5 rounded-xl inline-flex items-center gap-2"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Record Payment
          </button>
        </div>
      </div>

      {/* ── Global message ─────────────────────── */}
      {message && (
        <div
          className={`mb-5 p-3 rounded-xl text-sm ${
            message.type === 'error'
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* ── Fee Structure Panel ─────────────────── */}
      {showFeePanel && (
        <div className={`mb-6 rounded-2xl border p-5 ${card}`}>
          <h2 className={`font-semibold mb-4 ${heading}`}>Fee Structure Setup</h2>
          <p className={`text-xs mb-4 ${subText}`}>
            Define how much each class is required to pay per fee type per academic year.
            Saving the same class + type + year combination updates it in place.
          </p>
          <form onSubmit={submitFeeStructure} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end mb-5">
            <div>
              <label className={`block text-xs font-medium mb-1 ${subText}`}>Academic Year</label>
              <input type="text" value={feeForm.academicYear} onChange={handleFeeChange('academicYear')}
                className={inputCls} placeholder="e.g. 2026" required />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${subText}`}>Class</label>
              <input type="text" value={feeForm.className} onChange={handleFeeChange('className')}
                className={inputCls} placeholder="e.g. Class 8" required />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${subText}`}>Fee Type</label>
              <select value={feeForm.feeType} onChange={handleFeeChange('feeType')} className={inputCls} required>
                <option value="tuition">Tuition</option>
                <option value="exam">Exam</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${subText}`}>Amount (BDT)</label>
              <input type="number" min="0" value={feeForm.amount} onChange={handleFeeChange('amount')}
                className={inputCls} placeholder="e.g. 5000" required />
            </div>
            <button
              type="submit"
              disabled={feeSaving}
              className="btn-primary text-sm px-4 py-2.5 rounded-xl disabled:opacity-50"
            >
              {feeSaving ? 'Saving…' : 'Save'}
            </button>
          </form>

          {feeStructures.length > 0 && (
            <div className={`rounded-xl border overflow-hidden divide-y ${borderColor} ${divider}`}>
              {feeStructures.map((fs) => (
                <div key={fs._id} className={`flex items-center justify-between px-4 py-2.5 text-sm ${isDark ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'}`}>
                  <span className={heading}>{fs.className}</span>
                  <span className="capitalize px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">{fs.feeType}</span>
                  <span className={`font-semibold ${heading}`}>{money(fs.amount)}</span>
                  <span className={subText}>{fs.academicYear}</span>
                  {fs.label && <span className={subText}>{fs.label}</span>}
                </div>
              ))}
            </div>
          )}
          {feeStructures.length === 0 && (
            <p className={`text-sm ${subText}`}>No fee structures defined yet for this year.</p>
          )}
        </div>
      )}

      {/* ── Filters ────────────────────────────── */}
      <form
        onSubmit={applyFilters}
        className={`mb-6 rounded-2xl border p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end ${card}`}
      >
        <div>
          <label className={`block text-xs font-medium mb-1 ${subText}`}>From</label>
          <input type="date" value={filters.startDate} onChange={handleFilterChange('startDate')} className={inputCls} />
        </div>
        <div>
          <label className={`block text-xs font-medium mb-1 ${subText}`}>To</label>
          <input type="date" value={filters.endDate} onChange={handleFilterChange('endDate')} className={inputCls} />
        </div>
        <div>
          <label className={`block text-xs font-medium mb-1 ${subText}`}>Class</label>
          <input
            type="text"
            placeholder="e.g. Class 8"
            value={filters.className}
            onChange={handleFilterChange('className')}
            className={inputCls}
          />
        </div>
        <div>
          <label className={`block text-xs font-medium mb-1 ${subText}`}>Payment Type</label>
          <select value={filters.feeType} onChange={handleFilterChange('feeType')} className={inputCls}>
            {FEE_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary text-sm px-4 py-2.5 rounded-xl flex-1">
            Apply
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className={`text-sm px-3 py-2.5 rounded-xl border transition-all ${
              isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Clear
          </button>
        </div>
      </form>

      {loading ? (
        <div className={`text-sm ${subText} py-12 text-center`}>Loading report…</div>
      ) : summary ? (
        <>
          {/* ── Summary stat cards ─────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Total Collected"
              value={money(summary.totalCollection)}
              sub={`${summary.transactionCount} completed transactions`}
              color="text-emerald-600 dark:text-emerald-400"
              isDark={isDark}
            />
            <StatCard
              label="Total Pending Dues"
              value={money(summary.totalPendingDues)}
              sub="across all classes"
              color="text-red-600 dark:text-red-400"
              isDark={isDark}
            />
            <StatCard
              label="Tuition Collected"
              value={money(summary.revenueByType?.tuition)}
              color={isDark ? 'text-white' : 'text-slate-800'}
              isDark={isDark}
            />
            <StatCard
              label="Exam + Other Fees"
              value={money((summary.revenueByType?.exam || 0) + (summary.revenueByType?.other || 0))}
              color={isDark ? 'text-white' : 'text-slate-800'}
              isDark={isDark}
            />
          </div>

          {/* ── Export buttons ─────────────────── */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => handleExport('excel')}
              disabled={exporting !== null}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-5 py-2.5 rounded-xl disabled:opacity-50 transition-all"
            >
              {exporting === 'excel' ? 'Exporting…' : '📥 Export Excel'}
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={exporting !== null}
              className={`text-white text-sm px-5 py-2.5 rounded-xl disabled:opacity-50 transition-all ${
                isDark ? 'bg-slate-600 hover:bg-slate-500' : 'bg-slate-800 hover:bg-slate-700'
              }`}
            >
              {exporting === 'pdf' ? 'Exporting…' : '📄 Export PDF'}
            </button>
            <p className={`self-center text-xs ${subText}`}>
              PDF export is capped at 500 transactions per filter.
            </p>
          </div>

          {/* ── Chart + Pending dues ────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Revenue trend bar chart */}
            <div className={`rounded-2xl border p-5 ${card}`}>
              <h2 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${sectionTitle}`}>
                Revenue Trend (last 12 months)
              </h2>
              {summary.revenueTrend.length === 0 ? (
                <p className={`text-sm ${subText}`}>No completed transactions yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={summary.revenueTrend} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.08)'}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }}
                      tickFormatter={(v) => v.substring(5)} // show MM only
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value) => [money(value), 'Collected']}
                      labelFormatter={(label) => `Month: ${label}`}
                      contentStyle={{
                        background: isDark ? '#1e293b' : '#fff',
                        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                    <Bar
                      dataKey="total"
                      fill={isDark ? '#6366f1' : '#4f46e5'}
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Pending dues by class */}
            <div className={`rounded-2xl border p-5 ${card}`}>
              <h2 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${sectionTitle}`}>
                Pending Dues by Class
              </h2>
              {summary.pendingDuesByClass.length === 0 ? (
                <p className={`text-sm ${subText}`}>
                  No fee structures set up yet. Use ⚙️ Fee Structure above to define required amounts per class.
                </p>
              ) : (
                <div className={`rounded-xl border overflow-hidden divide-y ${borderColor} ${divider}`}>
                  <div className={`grid grid-cols-4 px-3 py-2 text-xs font-semibold uppercase tracking-wide ${subText}`}>
                    <span>Class</span>
                    <span className="text-right">Required</span>
                    <span className="text-right">Paid</span>
                    <span className="text-right">Pending</span>
                  </div>
                  {summary.pendingDuesByClass.map((row) => (
                    <div
                      key={row.className}
                      className={`grid grid-cols-4 px-3 py-2.5 text-sm ${isDark ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'}`}
                    >
                      <span className={`font-medium ${heading}`}>{row.className}</span>
                      <span className={`text-right ${subText}`}>{money(row.totalRequired)}</span>
                      <span className={`text-right text-emerald-600 dark:text-emerald-400`}>{money(row.totalPaid)}</span>
                      <span className={`text-right font-semibold ${row.pendingDues > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {money(row.pendingDues)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Transactions table ──────────────── */}
          <div className={`rounded-2xl border p-5 ${card}`}>
            <h2 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${sectionTitle}`}>
              Transactions
            </h2>
            {transactions.length === 0 ? (
              <p className={`text-sm ${subText}`}>No transactions match this filter.</p>
            ) : (
              <>
                <div className={`rounded-xl border overflow-hidden divide-y ${borderColor} ${divider}`}>
                  <div className={`grid grid-cols-6 px-4 py-2 text-xs font-semibold uppercase tracking-wide ${subText}`}>
                    <span>Date</span>
                    <span>Student</span>
                    <span>Class</span>
                    <span>Type</span>
                    <span className="text-right">Amount</span>
                    <span>Status</span>
                  </div>
                  {transactions.map((t) => (
                    <div
                      key={t._id}
                      className={`grid grid-cols-6 px-4 py-2.5 text-sm items-center ${isDark ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'}`}
                    >
                      <span className={subText}>{t.paymentDate?.substring(0, 10)}</span>
                      <span className={`font-medium truncate ${heading}`}>{t.studentName}</span>
                      <span className={subText}>{t.className}{t.section ? `-${t.section}` : ''}</span>
                      <span className={`capitalize ${subText}`}>{t.feeType}</span>
                      <span className={`text-right font-medium ${heading}`}>{money(t.amount)}</span>
                      <span>
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${
                          t.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                            : t.status === 'pending'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                        }`}>
                          {t.status}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex justify-between items-center mt-4">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className={`text-sm px-4 py-2 rounded-xl border transition-all disabled:opacity-40 ${
                      isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    ← Previous
                  </button>
                  <span className={`text-sm ${subText}`}>Page {page} of {pages}</span>
                  <button
                    disabled={page >= pages}
                    onClick={() => setPage((p) => p + 1)}
                    className={`text-sm px-4 py-2 rounded-xl border transition-all disabled:opacity-40 ${
                      isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Next →
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      ) : null}

      {/* ── Record Payment Modal ────────────────── */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            className={`w-full max-w-lg rounded-2xl border shadow-2xl p-6 ${
              isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className={`text-lg font-bold ${heading}`}>Record Payment</h2>
              <button
                onClick={() => { setShowPaymentModal(false); setTxForm(emptyTxForm); }}
                className={`text-xl leading-none ${subText} hover:text-red-500 transition-colors`}
              >
                ×
              </button>
            </div>

            <form onSubmit={submitTransaction} className="space-y-3">
              <div>
                <label className={`block text-xs font-medium mb-1 ${subText}`}>
                  Student User ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={txForm.student}
                  onChange={handleTxChange('student')}
                  className={inputCls}
                  placeholder="MongoDB ObjectId of the student's user account"
                />
                <p className={`text-xs mt-1 ${subText}`}>
                  Find this in the Students list (each student's profile URL contains their ID).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${subText}`}>Fee Type <span className="text-red-500">*</span></label>
                  <select value={txForm.feeType} onChange={handleTxChange('feeType')} className={inputCls} required>
                    <option value="tuition">Tuition</option>
                    <option value="exam">Exam</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${subText}`}>Label (if Other)</label>
                  <input type="text" value={txForm.label} onChange={handleTxChange('label')} className={inputCls} placeholder="e.g. Lab Fee" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${subText}`}>Amount (BDT) <span className="text-red-500">*</span></label>
                  <input type="number" min="0" step="0.01" required value={txForm.amount} onChange={handleTxChange('amount')} className={inputCls} placeholder="e.g. 5000" />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${subText}`}>Payment Method</label>
                  <select value={txForm.paymentMethod} onChange={handleTxChange('paymentMethod')} className={inputCls}>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m} className="capitalize">{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${subText}`}>Payment Date</label>
                  <input type="date" value={txForm.paymentDate} onChange={handleTxChange('paymentDate')} className={inputCls} />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${subText}`}>Academic Year</label>
                  <input type="text" value={txForm.academicYear} onChange={handleTxChange('academicYear')} className={inputCls} placeholder="e.g. 2026" />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1 ${subText}`}>Transaction Reference (optional)</label>
                <input type="text" value={txForm.transactionRef} onChange={handleTxChange('transactionRef')} className={inputCls} placeholder="Bank slip #, bKash trxID, etc." />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={txSaving}
                  className="btn-primary text-sm px-5 py-2.5 rounded-xl flex-1 disabled:opacity-50"
                >
                  {txSaving ? 'Saving…' : 'Record Payment'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowPaymentModal(false); setTxForm(emptyTxForm); }}
                  className={`text-sm px-5 py-2.5 rounded-xl border flex-1 transition-all ${
                    isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
