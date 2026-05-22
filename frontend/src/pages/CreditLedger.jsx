import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../utils/api.js';
import {
  Search,
  BookOpen,
  DollarSign,
  PlusCircle,
  IndianRupee,
  Calendar,
  AlertTriangle,
  History,
  CheckCircle,
  X,
  CreditCard,
  Smartphone,
  Wallet,
} from 'lucide-react';

const CreditLedger = () => {
  const { activeShift } = useAuth();

  // Credit list & metrics states
  const [credits, setCredits] = useState([]);
  const [summary, setSummary] = useState({ totalAmountIssued: 0, totalRemainingBalance: 0, totalPaid: 0 });
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Payment Drawer/Modal state
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('Cash');
  const [payRemarks, setPayRemarks] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Payment History state
  const [historyRecord, setHistoryRecord] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadCreditData();
  }, [search, statusFilter]);

  const loadCreditData = async () => {
    setLoading(true);
    try {
      const qParams = [];
      if (search) qParams.push(`search=${encodeURIComponent(search)}`);
      if (statusFilter) qParams.push(`status=${statusFilter}`);
      const queryStr = qParams.length > 0 ? `?${qParams.join('&')}` : '';

      const data = await api.get(`/credit${queryStr}`);
      setCredits(data);

      // Compile local totals for the filtered/current list
      const sum = data.reduce(
        (acc, item) => {
          acc.totalAmountIssued += item.amount;
          acc.totalRemainingBalance += item.remainingBalance;
          return acc;
        },
        { totalAmountIssued: 0, totalRemainingBalance: 0 }
      );
      sum.totalPaid = sum.totalAmountIssued - sum.totalRemainingBalance;
      setSummary(sum);
    } catch (err) {
      console.error('Error fetching credit data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReceivePaymentSubmit = async (e) => {
    e.preventDefault();
    setPaymentError('');

    if (!activeShift) {
      setPaymentError('No active shift is open. Please open a shift before collecting payments.');
      return;
    }

    if (!selectedRecord) return;

    if (payAmount === '' || Number(payAmount) <= 0) {
      setPaymentError('Please enter a valid amount.');
      return;
    }

    if (Number(payAmount) > selectedRecord.remainingBalance) {
      setPaymentError(`Payment amount cannot exceed the remaining balance of ₹${selectedRecord.remainingBalance.toFixed(2)}`);
      return;
    }

    setPaymentSubmitting(true);
    try {
      await api.post(`/credit/${selectedRecord._id}/pay`, {
        amountPaid: Number(payAmount),
        paymentMode: payMode,
        remarks: payRemarks,
      });

      alert('Payment collected and accounted successfully!');
      setSelectedRecord(null);
      setPayAmount('');
      setPayRemarks('');
      
      // Reload lists
      loadCreditData();
    } catch (err) {
      setPaymentError(err.message || 'Error processing payment.');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const loadPaymentHistory = async (record) => {
    setHistoryRecord(record);
    setLoadingHistory(true);
    try {
      const data = await api.get(`/credit/${record._id}/payments`);
      setPaymentHistory(data);
    } catch (err) {
      console.error('Error loading history:', err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case 'Paid':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'Partially Paid':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'Pending':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'Overdue':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400';
    }
  };

  const getStatusHindi = (status) => {
    switch (status) {
      case 'Paid': return 'भुगतान हो गया';
      case 'Partially Paid': return 'आंशिक भुगतान';
      case 'Pending': return 'बकाया';
      case 'Overdue': return 'अतिदेय';
      default: return '';
    }
  };

  const formatRupee = (val) => `₹${(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Credit Ledger Accounts</h1>
        <p className="text-xs text-slate-500">
          Monitor outstanding customer balances and log recoveries / ग्राहक उधार बही खाता नियंत्रण
        </p>
      </div>

      {/* Summary Metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border p-5 glass-panel shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Issued (कुल दिया उधार)</span>
          <h3 className="text-xl font-bold mt-1 text-slate-100">{formatRupee(summary.totalAmountIssued)}</h3>
        </div>
        <div className="rounded-2xl border p-5 glass-panel shadow-sm">
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Total Recovered (कुल वसूल राशि)</span>
          <h3 className="text-xl font-bold mt-1 text-emerald-400">{formatRupee(summary.totalPaid)}</h3>
        </div>
        <div className="rounded-2xl border border-rose-500/10 bg-rose-500/5 p-5 shadow-sm">
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Total Remaining (कुल बकाया शेष)</span>
          <h3 className="text-2xl font-extrabold mt-1 text-rose-400">{formatRupee(summary.totalRemainingBalance)}</h3>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-b border-slate-500/5 pb-4">
        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search by Name, Vehicle, Phone or Salesman..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-850 bg-slate-900/60 py-2.5 pl-9 pr-4 text-xs text-slate-100 placeholder-slate-650 outline-none focus:border-orange-500"
          />
        </div>

        {/* Status filters */}
        <div className="flex gap-2 w-full sm:w-auto">
          {['', 'Pending', 'Partially Paid', 'Paid'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${
                statusFilter === st
                  ? 'bg-orange-500/10 border-orange-500 text-orange-400'
                  : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
              }`}
            >
              {st === '' ? 'All Accounts' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Accounts List Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full py-16 text-center text-xs text-slate-500 font-semibold animate-pulse-subtle">
            Querying credit accounts ledger...
          </div>
        ) : credits.length > 0 ? (
          credits.map((c) => (
            <div key={c._id} className="rounded-2xl border glass-panel p-5 shadow-sm space-y-4 hover:border-slate-500/25 transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-200">{c.customerName}</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-mono">{c.vehicleNumber}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`rounded-lg px-2 py-0.5 text-[9px] font-bold ${getStatusStyles(c.status)}`}>
                    {c.status}
                  </span>
                  <span className="text-[8px] text-slate-500 mt-0.5">{getStatusHindi(c.status)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-500/5 bg-slate-900/10 px-2 rounded-lg">
                <div>
                  <span className="text-[10px] text-slate-500">Original Amount:</span>
                  <p className="font-semibold text-slate-400">{formatRupee(c.amount)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Remaining Balance:</span>
                  <p className="font-extrabold text-orange-400">{formatRupee(c.remainingBalance)}</p>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <span>Issued Date:</span>
                  <span>{new Date(c.date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Salesman:</span>
                  <span>{c.salesmanName}</span>
                </div>
                {c.notes && (
                  <div className="flex justify-between">
                    <span>Notes:</span>
                    <span className="max-w-[150px] truncate">{c.notes}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-500/5">
                <button
                  onClick={() => loadPaymentHistory(c)}
                  className="flex-1 flex items-center justify-center space-x-1.5 rounded-lg border border-slate-800 bg-slate-900/40 py-2 text-[10px] font-bold text-slate-400 hover:border-slate-700"
                >
                  <History className="h-3 w-3" />
                  <span>View History</span>
                </button>
                {c.remainingBalance > 0 && (
                  <button
                    onClick={() => {
                      setSelectedRecord(c);
                      setPaymentError('');
                    }}
                    className="flex-1 flex items-center justify-center space-x-1.5 rounded-lg bg-orange-600 py-2 text-[10px] font-bold text-white hover:bg-orange-700 transition-colors"
                  >
                    <IndianRupee className="h-3 w-3" />
                    <span>Pay (भुगतान)</span>
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-16 text-center text-xs text-slate-500 border border-dashed border-slate-500/20 rounded-2xl">
            No credit ledger records found matching filters
          </div>
        )}
      </div>

      {/* COLLECT PAYMENT MODAL */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#12141c] p-6 text-slate-200 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-850">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Receive Credit Payment / उधार भुगतान
              </h3>
              <button onClick={() => setSelectedRecord(null)} className="text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 p-3.5 bg-slate-900 rounded-xl border border-slate-850 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-semibold text-slate-200">{selectedRecord.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vehicle / Phone:</span>
                <span className="font-mono text-slate-300">{selectedRecord.vehicleNumber} ({selectedRecord.mobileNumber})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Outstanding Balance:</span>
                <span className="font-bold text-orange-400">{formatRupee(selectedRecord.remainingBalance)}</span>
              </div>
            </div>

            {paymentError && (
              <div className="mt-4 flex items-start space-x-2 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            <form onSubmit={handleReceivePaymentSubmit} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">PAYMENT MODE / भुगतान का तरीका</label>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {[
                    { id: 'Cash', label: 'Cash (नकद)', icon: Wallet },
                    { id: 'UPI', label: 'UPI (यूपीआई)', icon: Smartphone },
                    { id: 'POS', label: 'Card (कार्ड)', icon: CreditCard },
                  ].map((mode) => {
                    const Icon = mode.icon;
                    const isSel = payMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setPayMode(mode.id)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-semibold transition-all ${
                          isSel
                            ? 'bg-orange-500/10 border-orange-500 text-orange-400'
                            : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <Icon className="h-4 w-4 mb-1" />
                        <span>{mode.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">COLLECTED AMOUNT / प्राप्त राशि (₹)</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 1000"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-850 bg-slate-900 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-650 outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">REMARKS / विवरण</label>
                <input
                  type="text"
                  placeholder="e.g. Received partial payment"
                  value={payRemarks}
                  onChange={(e) => setPayRemarks(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-850 bg-slate-900 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-650 outline-none focus:border-orange-500"
                />
              </div>

              {payMode === 'Cash' && (
                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3 text-[10px] text-emerald-400/90 leading-tight">
                  *Note: Cash payments will automatically move to the active Counter Cash balance.
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-750"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentSubmitting || !activeShift}
                  className="rounded-lg bg-orange-600 hover:bg-orange-700 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-orange-600/10"
                >
                  {paymentSubmitting ? 'Recording...' : 'Collect Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAYMENT HISTORY MODAL */}
      {historyRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#12141c] p-6 text-slate-200 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-850">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Payment History / भुगतान इतिहास
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Account audit trace for {historyRecord.customerName}</p>
              </div>
              <button onClick={() => setHistoryRecord(null)} className="text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 max-h-80 overflow-y-auto space-y-3 pr-1">
              {loadingHistory ? (
                <div className="py-12 text-center text-xs text-slate-500 font-semibold animate-pulse-subtle">
                  Retrieving history logs...
                </div>
              ) : paymentHistory.length > 0 ? (
                paymentHistory.map((p) => (
                  <div key={p._id} className="p-3 bg-slate-900 border border-slate-850 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-200">{formatRupee(p.amountPaid)}</span>
                        <span className="rounded bg-slate-800 border border-slate-700 px-1.5 py-0.5 text-[8px] text-slate-400 font-mono">
                          {p.paymentMode}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Collector: {p.receiver?.name || 'N/A'} • {p.remarks}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(p.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-500/20 rounded-2xl">
                  No payment events logged yet
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-850 mt-4">
              <button
                type="button"
                onClick={() => setHistoryRecord(null)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-750"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditLedger;
