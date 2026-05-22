import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../utils/api.js';
import {
  Wallet,
  ArrowRightLeft,
  Building,
  Receipt,
  Plus,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

const CounterManagement = () => {
  const { activeShift } = useAuth();

  // Transaction list state
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [txType, setTxType] = useState('Expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (activeShift) {
      loadTransactions();
    }
  }, [activeShift]);

  const loadTransactions = async () => {
    if (!activeShift?.shift?._id) return;
    setLoading(true);
    try {
      const data = await api.get(`/counter/transactions?shiftId=${activeShift.shift._id}`);
      setTransactions(data);
    } catch (err) {
      console.error('Error loading counter transactions:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!activeShift) {
      setErrorMsg('No active shift is open. Open a shift to perform counter transactions.');
      return;
    }

    if (amount === '' || Number(amount) <= 0) {
      setErrorMsg('Please specify a valid transaction amount.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/counter/transactions', {
        type: txType,
        amount: Number(amount),
        description,
      });

      setSuccessMsg(`${txType} recorded successfully!`);
      setAmount('');
      setDescription('');
      
      // Reload lists and shift context balance
      loadTransactions();
    } catch (err) {
      setErrorMsg(err.message || 'Error recording transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  const getTxTypeStyles = (type) => {
    switch (type) {
      case 'Fresh Cash Sale':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'Return Credit Cash':
        return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
      case 'Expense':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'Cash Transfer':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'Bank Deposit':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400';
    }
  };

  const getTxHindiLabel = (type) => {
    switch (type) {
      case 'Fresh Cash Sale': return 'ताजा नकद बिक्री';
      case 'Return Credit Cash': return 'उधार वापसी नकद';
      case 'Expense': return 'खर्च';
      case 'Cash Transfer': return 'कैश ट्रांसफर';
      case 'Bank Deposit': return 'बैंक जमा';
      default: return '';
    }
  };

  const formatRupee = (val) => `₹${(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Counter Cash Management</h1>
        <p className="text-xs text-slate-500">
          Track desk inflows, bank deposits and daily expenses / काउंटर नकद और व्यय ट्रैकिंग
        </p>
      </div>

      {!activeShift && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-500">
          <AlertTriangle className="h-5 w-5 inline mr-2 align-text-bottom" />
          <strong>Freeze Mode:</strong> You cannot perform counter transactions because there is no open shift currently.
        </div>
      )}

      {/* Cash drawer totals metrics cards */}
      {activeShift && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border p-5 glass-panel shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Start Balance (शुरुआती नकद)</span>
            <h3 className="text-xl font-bold mt-1.5">{formatRupee(activeShift.shift.startCash)}</h3>
          </div>
          <div className="rounded-2xl border p-5 glass-panel shadow-sm">
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Total Inflow (कुल आवक)</span>
            <h3 className="text-xl font-bold mt-1.5 text-emerald-500">
              +{formatRupee(activeShift.freshCashSales + activeShift.returnCreditCash)}
            </h3>
            <p className="text-[9px] text-slate-500 mt-1">
              Sales Cash + Credit Recovery
            </p>
          </div>
          <div className="rounded-2xl border p-5 glass-panel shadow-sm">
            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Total Outflow (कुल निकासी)</span>
            <h3 className="text-xl font-bold mt-1.5 text-rose-500">
              -{formatRupee(activeShift.cashTransfers + activeShift.bankDeposits + activeShift.expenses)}
            </h3>
            <p className="text-[9px] text-slate-500 mt-1">
              Expenses + Deposits + Transfers
            </p>
          </div>
          <div className="rounded-2xl border border-orange-500/10 bg-orange-500/5 p-5 shadow-sm">
            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Net Cash in Drawer (बचे नकद)</span>
            <h3 className="text-2xl font-extrabold mt-1.5 text-orange-400">
              {formatRupee(activeShift.expectedCash)}
            </h3>
          </div>
        </div>
      )}

      {/* Main split */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Form: Add Transaction */}
        <div className="space-y-4 lg:col-span-4">
          <div className="rounded-2xl border glass-panel p-6 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Record Cash Outflow / नकद भुगतान दर्ज करें
            </h3>
            <p className="text-xs text-slate-500 mt-1">Record bank deposits, cash transfers or pump expenses</p>

            {successMsg && (
              <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-400">
                <CheckCircle className="h-4 w-4 inline mr-1.5 align-text-bottom" />
                {successMsg}
              </div>
            )}

            {errorMsg && (
              <div className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400">
                <AlertTriangle className="h-4 w-4 inline mr-1.5 align-text-bottom" />
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">TRANSACTION TYPE / प्रकार</label>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {[
                    { id: 'Expense', label: 'Expense', hindi: 'खर्च', icon: Receipt },
                    { id: 'Cash Transfer', label: 'Transfer', hindi: 'हस्तांतरण', icon: ArrowRightLeft },
                    { id: 'Bank Deposit', label: 'Deposit', hindi: 'बैंक जमा', icon: Building },
                  ].map((btn) => {
                    const Icon = btn.icon;
                    const isSel = txType === btn.id;
                    return (
                      <button
                        key={btn.id}
                        type="button"
                        onClick={() => setTxType(btn.id)}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                          isSel
                            ? 'bg-orange-500/10 border-orange-500 text-orange-400'
                            : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <Icon className="h-4.5 w-4.5 mb-1" />
                        <span>{btn.label}</span>
                        <span className="text-[8px] font-normal opacity-80 mt-0.5">{btn.hindi}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">AMOUNT / राशि (₹)</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-850 bg-slate-900 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">REMARKS / विवरण</label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Tea and snacks for staff, Deposit in SBI"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-850 bg-slate-900 p-3 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-orange-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !activeShift}
                className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/10 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {submitting ? 'Recording...' : 'Record Transaction / सहेजें'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Recent Transactions Table */}
        <div className="space-y-4 lg:col-span-8">
          <div className="rounded-2xl border glass-panel p-6 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Shift Cash Ledger / शिफ्ट का नकद विवरण
            </h3>
            <p className="text-xs text-slate-500 mt-1">Inflows and Outflows logged during active shift</p>

            <div className="mt-5 overflow-x-auto">
              {loading ? (
                <div className="py-12 text-center text-xs text-slate-500 font-semibold animate-pulse-subtle">
                  Loading transaction ledger...
                </div>
              ) : transactions.length > 0 ? (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-500/10 text-slate-500 font-medium uppercase tracking-wider">
                      <th className="py-3 px-4">Type / प्रकार</th>
                      <th className="py-3 px-4">Amount / राशि</th>
                      <th className="py-3 px-4">Remarks / विवरण</th>
                      <th className="py-3 px-4">Recorded By</th>
                      <th className="py-3 px-4 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-500/5">
                    {transactions.map((tx) => (
                      <tr key={tx._id} className="hover:bg-slate-500/5">
                        <td className="py-3 px-4">
                          <div className="flex flex-col items-start">
                            <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${getTxTypeStyles(tx.type)}`}>
                              {tx.type}
                            </span>
                            <span className="text-[8px] text-slate-500 mt-0.5">{getTxHindiLabel(tx.type)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-200">
                          {['Fresh Cash Sale', 'Return Credit Cash'].includes(tx.type) ? '+' : '-'}
                          {formatRupee(tx.amount)}
                        </td>
                        <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{tx.description}</td>
                        <td className="py-3 px-4 text-slate-400">{tx.enteredBy?.name}</td>
                        <td className="py-3 px-4 text-slate-400 text-right">
                          {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex h-60 items-center justify-center text-xs text-slate-500 font-medium border border-dashed border-slate-500/25 rounded-xl">
                  No transaction ledger recorded for this shift
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CounterManagement;
