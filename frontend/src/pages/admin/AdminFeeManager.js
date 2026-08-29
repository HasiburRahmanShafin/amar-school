import { useEffect, useState } from 'react';
import { api } from '../../api/StudentApi';
import * as feeApi from '../../api/feeApi';
import AdminLayout from '../../components/layout/AdminLayout';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const emptyForm = {
  studentId: '',
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  tuitionFee: '',
  examFee: '',
  otherCharges: '',
  lateFee: '',
  discount: '',
};

export default function AdminFeeManager() {
  const { isDark } = useAuth();
  const { showToast } = useToast();

  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [ledgers, setLedgers] = useState([]);
  const [loadingLedgers, setLoadingLedgers] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    api.get(`/students?${params}`).then((res) => setStudents(res.data)).catch(() => {});
  }, [search]);

  const loadLedgers = (studentId) => {
    if (!studentId) { setLedgers([]); return; }
    setLoadingLedgers(true);
    feeApi.getStudentFees(studentId)
      .then((res) => setLedgers(res.data.data))
      .catch((err) => showToast?.(err.response?.data?.message || 'Failed to load fee ledger', 'error'))
      .finally(() => setLoadingLedgers(false));
  };

  useEffect(() => { loadLedgers(selectedStudentId); }, [selectedStudentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.studentId) {
      showToast?.('Select a student first', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await feeApi.setFeeForStudent({
        studentId: form.studentId,
        year: Number(form.year),
        month: Number(form.month),
        tuitionFee: Number(form.tuitionFee) || 0,
        examFee: Number(form.examFee) || 0,
        otherCharges: Number(form.otherCharges) || 0,
        lateFee: Number(form.lateFee) || 0,
        discount: Number(form.discount) || 0,
      });
      showToast?.('Fee saved for this student', 'success');
      setSelectedStudentId(form.studentId);
      loadLedgers(form.studentId);
    } catch (err) {
      showToast?.(err.response?.data?.message || 'Failed to save fee', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const heading = isDark ? 'text-white' : 'text-slate-800';
  const subText = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardBg = isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200/80';
  const inputCls = `input-field border rounded-xl px-4 py-2.5 text-sm w-full ${
    isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
  }`;
  const labelCls = `block text-xs font-medium mb-1 ${subText}`;

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className={`text-2xl font-bold ${heading}`}>Fee Management</h1>
        <p className={`text-sm mt-0.5 ${subText}`}>Set up monthly tuition, exam fees, and other charges per student.</p>
      </div>

      <div className={`border rounded-2xl p-6 mb-8 ${cardBg}`}>
        <h2 className={`font-semibold mb-4 ${heading}`}>Set / Update Fee</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="set-fee-form">
          <div className="sm:col-span-2">
            <label className={labelCls}>Search student</label>
            <input type="text" placeholder="Search by name…" value={search}
              onChange={(e) => setSearch(e.target.value)} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Student</label>
            <select value={form.studentId} onChange={(e) => handleChange('studentId', e.target.value)} required className={inputCls}>
              <option value="">Select a student…</option>
              {students.map((s) => (
                <option key={s._id} value={s._id}>{s.name} - {s.studentId} (Class {s.currentClass}-{s.section})</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Month</label>
            <select value={form.month} onChange={(e) => handleChange('month', e.target.value)} className={inputCls}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Year</label>
            <input type="number" value={form.year} onChange={(e) => handleChange('year', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Tuition fee (BDT)</label>
            <input type="number" min="0" value={form.tuitionFee} onChange={(e) => handleChange('tuitionFee', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Exam fee (BDT)</label>
            <input type="number" min="0" value={form.examFee} onChange={(e) => handleChange('examFee', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Other charges (BDT)</label>
            <input type="number" min="0" value={form.otherCharges} onChange={(e) => handleChange('otherCharges', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Late fee (BDT)</label>
            <input type="number" min="0" value={form.lateFee} onChange={(e) => handleChange('lateFee', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Discount (BDT)</label>
            <input type="number" min="0" value={form.discount} onChange={(e) => handleChange('discount', e.target.value)} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={submitting} className="btn-primary text-sm px-6 py-2.5 rounded-xl">
              {submitting ? 'Saving…' : 'Save Fee'}
            </button>
          </div>
        </form>
      </div>

      <div className={`border rounded-2xl p-6 ${cardBg}`}>
        <h2 className={`font-semibold mb-4 ${heading}`}>View Ledger</h2>
        <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className={`${inputCls} mb-4 sm:w-96`}>
          <option value="">Select a student…</option>
          {students.map((s) => (
            <option key={s._id} value={s._id}>{s.name} - {s.studentId}</option>
          ))}
        </select>

        {loadingLedgers && <p className={subText}>Loading…</p>}
        {!loadingLedgers && selectedStudentId && ledgers.length === 0 && (
          <p className={subText}>No fee records yet for this student.</p>
        )}
        {!loadingLedgers && ledgers.length > 0 && (
          <div className={`border rounded-xl overflow-hidden divide-y ${isDark ? 'divide-slate-700/60' : 'divide-slate-100'}`}>
            {ledgers.map((l) => (
              <div key={l.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className={heading}>{l.monthLabel}</span>
                <span className={subText}>Total {l.totalAmount} · Paid {l.paidAmount} · Due {l.dueAmount}</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                  l.status === 'paid' ? 'bg-emerald-100 text-emerald-700'
                  : l.status === 'partial' ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'}`}>
                  {l.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
