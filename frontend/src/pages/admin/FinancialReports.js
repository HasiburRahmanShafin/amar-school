import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as financialApi from '../../api/financialApi';

const FEE_TYPES = [
  { value: '', label: 'All Fee Types' },
  { value: 'tuition', label: 'Tuition' },
  { value: 'exam', label: 'Exam' },
  { value: 'other', label: 'Other' },
];

const emptyFilters = { startDate: '', endDate: '', className: '', feeType: '' };

function FinancialReports() {
  const [filters, setFilters] = useState(emptyFilters);
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState(null);

  // Clean out empty filter values so we don't send e.g. className=''
  const activeFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));

  const load = () => {
    setLoading(true);
    setMessage(null);
    Promise.all([
      financialApi.getFinancialSummary(activeFilters),
      financialApi.getTransactions({ ...activeFilters, page }),
    ])
      .then(([summaryRes, txRes]) => {
        setSummary(summaryRes.data);
        setTransactions(txRes.data.transactions);
        setPages(txRes.data.pages);
      })
      .catch((err) => setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load report' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleFilterChange = (field) => (e) => {
    setFilters((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const applyFilters = (e) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    setPage(1);
  };

  const handleExport = async (type) => {
    setExporting(true);
    setMessage(null);
    try {
      if (type === 'excel') await financialApi.exportExcel(activeFilters);
      else await financialApi.exportPdf(activeFilters);
    } catch (err) {
      setMessage({ type: 'error', text: 'Export failed' });
    } finally {
      setExporting(false);
    }
  };

  const money = (n) => `BDT ${Number(n || 0).toLocaleString()}`;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Financial Reports</h1>
        <Link to="/admin/dashboard" className="text-sm text-blue-600">
          Back to Dashboard
        </Link>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded text-sm ${
            message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Filters */}
      <form onSubmit={applyFilters} className="bg-white rounded shadow p-5 mb-6 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input type="date" value={filters.startDate} onChange={handleFilterChange('startDate')} className="border rounded px-2 py-1.5 w-full" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input type="date" value={filters.endDate} onChange={handleFilterChange('endDate')} className="border rounded px-2 py-1.5 w-full" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Class</label>
          <input
            type="text"
            placeholder="e.g. Class 8"
            value={filters.className}
            onChange={handleFilterChange('className')}
            className="border rounded px-2 py-1.5 w-full"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Payment Type</label>
          <select value={filters.feeType} onChange={handleFilterChange('feeType')} className="border rounded px-2 py-1.5 w-full">
            {FEE_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="bg-blue-600 text-white rounded px-4 py-1.5 text-sm">
            Apply
          </button>
          <button type="button" onClick={clearFilters} className="border rounded px-3 py-1.5 text-sm">
            Clear
          </button>
        </div>
      </form>

      {loading ? (
        <p className="text-gray-500">Loading report...</p>
      ) : (
        summary && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded shadow p-5">
                <p className="text-sm text-gray-500">Total Collection</p>
                <p className="text-2xl font-bold text-green-700">{money(summary.totalCollection)}</p>
                <p className="text-xs text-gray-400 mt-1">{summary.transactionCount} completed transactions</p>
              </div>
              <div className="bg-white rounded shadow p-5">
                <p className="text-sm text-gray-500">Total Pending Dues</p>
                <p className="text-2xl font-bold text-red-600">{money(summary.totalPendingDues)}</p>
              </div>
              <div className="bg-white rounded shadow p-5">
                <p className="text-sm text-gray-500 mb-1">By Fee Type</p>
                <div className="text-sm">
                  <p>Tuition: {money(summary.revenueByType.tuition)}</p>
                  <p>Exam: {money(summary.revenueByType.exam)}</p>
                  <p>Other: {money(summary.revenueByType.other)}</p>
                </div>
              </div>
            </div>

            {/* Export buttons */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={() => handleExport('excel')}
                disabled={exporting}
                className="bg-emerald-600 text-white rounded px-4 py-2 text-sm disabled:opacity-50"
              >
                Export Excel
              </button>
              <button
                onClick={() => handleExport('pdf')}
                disabled={exporting}
                className="bg-gray-800 text-white rounded px-4 py-2 text-sm disabled:opacity-50"
              >
                Export PDF
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Revenue trend */}
              <div className="bg-white rounded shadow p-5">
                <h2 className="font-semibold mb-3">Revenue Trend</h2>
                {summary.revenueTrend.length === 0 ? (
                  <p className="text-sm text-gray-400">No completed transactions yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="pb-1">Month</th>
                        <th className="pb-1 text-right">Collected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.revenueTrend.map((row) => (
                        <tr key={row.month} className="border-t">
                          <td className="py-1">{row.month}</td>
                          <td className="py-1 text-right">{money(row.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pending dues by class */}
              <div className="bg-white rounded shadow p-5">
                <h2 className="font-semibold mb-3">Pending Dues by Class</h2>
                {summary.pendingDuesByClass.length === 0 ? (
                  <p className="text-sm text-gray-400">No fee structure or students set up yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="pb-1">Class</th>
                        <th className="pb-1 text-right">Required</th>
                        <th className="pb-1 text-right">Paid</th>
                        <th className="pb-1 text-right">Pending</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.pendingDuesByClass.map((row) => (
                        <tr key={row.className} className="border-t">
                          <td className="py-1">{row.className}</td>
                          <td className="py-1 text-right">{money(row.totalRequired)}</td>
                          <td className="py-1 text-right">{money(row.totalPaid)}</td>
                          <td className="py-1 text-right text-red-600">{money(row.pendingDues)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Transactions table */}
            <div className="bg-white rounded shadow p-5">
              <h2 className="font-semibold mb-3">Transactions</h2>
              {transactions.length === 0 ? (
                <p className="text-sm text-gray-400">No transactions match this filter.</p>
              ) : (
                <>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="pb-1">Date</th>
                        <th className="pb-1">Student</th>
                        <th className="pb-1">Class</th>
                        <th className="pb-1">Type</th>
                        <th className="pb-1 text-right">Amount</th>
                        <th className="pb-1">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((t) => (
                        <tr key={t._id} className="border-t">
                          <td className="py-1">{t.paymentDate.substring(0, 10)}</td>
                          <td className="py-1">{t.studentName}</td>
                          <td className="py-1">
                            {t.className}
                            {t.section ? ` - ${t.section}` : ''}
                          </td>
                          <td className="py-1 capitalize">{t.feeType}</td>
                          <td className="py-1 text-right">{money(t.amount)}</td>
                          <td className="py-1 capitalize">{t.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex justify-between items-center mt-3 text-sm">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="border rounded px-3 py-1 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <span>
                      Page {page} of {pages}
                    </span>
                    <button
                      disabled={page >= pages}
                      onClick={() => setPage((p) => p + 1)}
                      className="border rounded px-3 py-1 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )
      )}
    </div>
  );
}

export default FinancialReports;
