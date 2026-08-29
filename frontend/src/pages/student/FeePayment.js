import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/StudentApi';
import * as feeApi from '../../api/feeApi';
import { useDarkMode } from '../../components/DarkModeToggle';

const STATUS_STYLE = {
  paid: 'bg-emerald-100 text-emerald-700',
  partial: 'bg-amber-100 text-amber-700',
  unpaid: 'bg-red-100 text-red-700',
};

const emptyCard = { amount: '', method: 'card', cardNumber: '', expiry: '', cvv: '' };

export default function FeePayment() {
  const [isDark] = useDarkMode();
  const [studentId, setStudentId] = useState(null);
  const [fees, setFees] = useState([]);
  const [totalDue, setTotalDue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [payingId, setPayingId] = useState(null); // fee ledger _id currently being paid
  const [form, setForm] = useState(emptyCard);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [receipt, setReceipt] = useState(null);

  const loadFees = (id) => {
    setLoading(true);
    setError('');
    feeApi
      .getStudentFees(id)
      .then((res) => { setFees(res.data.data); setTotalDue(res.data.totalDue); })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load fee records.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get('/students/me')
      .then((res) => { setStudentId(res.data._id); loadFees(res.data._id); })
      .catch(() => { setError('Could not load your profile.'); setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openPayModal = (fee) => {
    setPayingId(fee.id);
    setForm({ ...emptyCard, amount: fee.dueAmount });
    setPayError('');
    setReceipt(null);
  };

  const closeModal = () => {
    setPayingId(null);
    setForm(emptyCard);
    setPayError('');
  };

  const handlePay = async () => {
    setPaying(true);
    setPayError('');
    try {
      const res = await feeApi.payFee(payingId, {
        amount: Number(form.amount),
        method: form.method,
        cardNumber: form.cardNumber,
        expiry: form.expiry,
        cvv: form.cvv,
      });
      setReceipt(res.data.data.receipt);
      loadFees(studentId);
    } catch (err) {
      setPayError(err.response?.data?.message || 'Payment failed. Please check your details and try again.');
    } finally {
      setPaying(false);
    }
  };

  const pageBg = isDark ? 'bg-gray-900' : 'bg-blue-50';
  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-blue-100';
  const heading = isDark ? 'text-gray-100' : 'text-blue-900';
  const subText = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputCls = `border rounded-lg px-3 py-2 text-sm w-full ${isDark ? 'bg-gray-900 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-800'}`;

  return (
    <div className={`min-h-screen ${pageBg} py-10 px-6 transition-colors duration-300`}>
      <div className="max-w-2xl mx-auto">
        <Link to="/student/dashboard" className="text-sm text-indigo-500 hover:underline">&larr; Dashboard</Link>
        <h1 className={`text-2xl font-bold mt-2 mb-1 ${heading}`}>Fee Payment</h1>
        <p className={`text-sm mb-6 ${subText}`}>View your fee breakdown and pay tuition, exam, or other charges online.</p>

        <div className={`border rounded-xl p-6 mb-6 flex items-center justify-between ${cardBg}`}>
          <div>
            <p className={`text-xs ${subText}`}>Total outstanding due</p>
            <p className={`text-3xl font-bold ${heading}`}>{totalDue} BDT</p>
          </div>
        </div>

        {error && <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">{error}</div>}
        {loading && <div className={`border rounded-xl p-8 text-center ${cardBg} ${subText}`}>Loading…</div>}

        {!loading && fees.length === 0 && !error && (
          <div className={`border rounded-xl p-8 text-center ${cardBg} ${subText}`}>
            No fee records yet. Your school admin hasn't set up a fee ledger for you.
          </div>
        )}

        <div className="space-y-4">
          {fees.map((f) => (
            <div key={f.id} className={`border rounded-xl p-5 ${cardBg}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`font-semibold ${heading}`}>{f.monthLabel}</h3>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_STYLE[f.status]}`}>{f.status}</span>
              </div>
              <div className={`grid grid-cols-2 gap-y-1 text-sm mb-3 ${subText}`}>
                <span>Tuition</span><span className={`text-right ${heading}`}>{f.tuitionFee} BDT</span>
                <span>Exam fee</span><span className={`text-right ${heading}`}>{f.examFee} BDT</span>
                <span>Other charges</span><span className={`text-right ${heading}`}>{f.otherCharges} BDT</span>
                <span>Late fee</span><span className={`text-right ${heading}`}>{f.lateFee} BDT</span>
                <span>Discount</span><span className={`text-right ${heading}`}>-{f.discount} BDT</span>
                <span className="font-semibold">Total</span><span className={`text-right font-semibold ${heading}`}>{f.totalAmount} BDT</span>
                <span>Paid</span><span className={`text-right ${heading}`}>{f.paidAmount} BDT</span>
                <span className="font-semibold">Due</span><span className={`text-right font-semibold ${heading}`}>{f.dueAmount} BDT</span>
              </div>

              {f.payments?.length > 0 && (
                <div className={`text-xs mb-3 ${subText}`}>
                  {f.payments.map((p) => (
                    <div key={p.transactionId}>
                      ✓ Paid {p.amount} BDT via {p.method} on {new Date(p.paidAt).toLocaleDateString()} · Txn: {p.transactionId}
                    </div>
                  ))}
                </div>
              )}

              {f.dueAmount > 0 && (
                <button
                  onClick={() => openPayModal(f)}
                  className="btn-primary text-sm px-4 py-2 rounded-lg"
                >
                  Pay Now
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Payment modal */}
        {payingId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className={`w-full max-w-sm rounded-xl border p-6 ${cardBg}`}>
              {!receipt ? (
                <>
                  <h3 className={`font-semibold mb-4 ${heading}`}>Pay Fee</h3>
                  {payError && <div className="mb-3 px-3 py-2 rounded-lg text-xs bg-red-50 text-red-700 border border-red-200">{payError}</div>}
                  <div className="space-y-3">
                    <div>
                      <label className={`block text-xs mb-1 ${subText}`}>Amount (BDT)</label>
                      <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className={`block text-xs mb-1 ${subText}`}>Payment method</label>
                      <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className={inputCls}>
                        <option value="card">Card</option>
                        <option value="mobile_banking">Mobile Banking</option>
                        <option value="bank">Bank Transfer</option>
                      </select>
                    </div>
                    {form.method === 'card' && (
                      <>
                        <div>
                          <label className={`block text-xs mb-1 ${subText}`}>Card number</label>
                          <input type="text" placeholder="4111 1111 1111 1111" value={form.cardNumber}
                            onChange={(e) => setForm({ ...form, cardNumber: e.target.value })} className={inputCls} />
                        </div>
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className={`block text-xs mb-1 ${subText}`}>Expiry (MM/YY)</label>
                            <input type="text" placeholder="08/28" value={form.expiry}
                              onChange={(e) => setForm({ ...form, expiry: e.target.value })} className={inputCls} />
                          </div>
                          <div className="flex-1">
                            <label className={`block text-xs mb-1 ${subText}`}>CVV</label>
                            <input type="text" placeholder="123" value={form.cvv}
                              onChange={(e) => setForm({ ...form, cvv: e.target.value })} className={inputCls} />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex gap-3 mt-5">
                    <button onClick={closeModal} className={`flex-1 text-sm px-4 py-2 rounded-lg border ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-600'}`}>Cancel</button>
                    <button onClick={handlePay} disabled={paying} className="flex-1 btn-primary text-sm px-4 py-2 rounded-lg">
                      {paying ? 'Processing…' : 'Pay'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className={`font-semibold mb-3 ${heading}`}>✅ Payment Successful</h3>
                  <div className={`text-sm space-y-1 mb-4 ${subText}`}>
                    <p><strong className={heading}>Transaction ID:</strong> {receipt.transactionId}</p>
                    <p><strong className={heading}>Amount paid:</strong> {receipt.amountPaid} BDT</p>
                    <p><strong className={heading}>Month:</strong> {receipt.month}</p>
                    <p><strong className={heading}>Remaining due:</strong> {receipt.remainingDue} BDT</p>
                    <p className="text-xs mt-2">A copy of this receipt has been emailed to your guardian.</p>
                  </div>
                  <button onClick={closeModal} className="btn-primary w-full text-sm px-4 py-2 rounded-lg">Done</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
