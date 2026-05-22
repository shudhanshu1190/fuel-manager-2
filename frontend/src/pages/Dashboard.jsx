import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { api } from '../utils/api.js';
import {
  TrendingUp,
  Droplet,
  Fuel,
  Wallet,
  ArrowDownLeft,
  Clock,
  Unlock,
  Lock,
  Plus,
  IndianRupee,
  Smartphone,
  CreditCard,
  AlertTriangle,
  ArrowRight,
  User,
  Activity,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const Dashboard = () => {
  const { user, activeShift, openShift, closeShift, reopenShift, fetchActiveShift, shiftLoading } = useAuth();
  const { isDark } = useTheme();

  // Metrics state
  const [salesSummary, setSalesSummary] = useState(null);
  const [creditSummary, setCreditSummary] = useState(null);
  const [recentSales, setRecentSales] = useState([]);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  // Shift form states
  const [startCashInput, setStartCashInput] = useState('');
  const [endCashInput, setEndCashInput] = useState('');
  const [shiftRemarks, setShiftRemarks] = useState('');
  const [showShiftActionModal, setShowShiftActionModal] = useState(false);
  const [actionError, setActionError] = useState('');

  // Shift history for Owner reopen dashboard
  const [shiftHistory, setShiftHistory] = useState([]);

  useEffect(() => {
    if (activeShift) {
      loadShiftMetrics();
    } else {
      loadClosedStateData();
    }
  }, [activeShift]);

  const loadShiftMetrics = async () => {
    if (!activeShift?.shift?._id) return;
    setLoadingMetrics(true);
    try {
      // Fetch sales report for the active shift
      const salesData = await api.get(`/reports/sales?shiftId=${activeShift.shift._id}`);
      setSalesSummary(salesData.summary);
      setRecentSales(salesData.sales.slice(0, 5));

      // Fetch credits for the active shift
      const creditData = await api.get(`/reports/credit?shiftId=${activeShift.shift._id}`);
      setCreditSummary(creditData.summary);
    } catch (err) {
      console.error('Error loading shift metrics:', err.message);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const loadClosedStateData = async () => {
    // If shift is closed, show historical shifts list for Owner to potentially reopen
    if (user?.role === 'Owner') {
      try {
        const shifts = await api.get('/shift/history');
        setShiftHistory(shifts.slice(0, 5));
      } catch (err) {
        console.error('Error fetching shift history:', err.message);
      }
    }
  };

  const handleOpenShiftSubmit = async (e) => {
    e.preventDefault();
    setActionError('');
    if (startCashInput === '' || Number(startCashInput) < 0) {
      setActionError('Please enter a valid starting cash amount.');
      return;
    }

    try {
      await openShift(Number(startCashInput), shiftRemarks);
      setStartCashInput('');
      setShiftRemarks('');
      setShowShiftActionModal(false);
    } catch (err) {
      setActionError(err.message || 'Failed to open shift.');
    }
  };

  const handleCloseShiftSubmit = async (e) => {
    e.preventDefault();
    setActionError('');
    if (endCashInput === '' || Number(endCashInput) < 0) {
      setActionError('Please enter a valid closing cash amount.');
      return;
    }

    try {
      const result = await closeShift(Number(endCashInput), shiftRemarks);
      setEndCashInput('');
      setShiftRemarks('');
      setShowShiftActionModal(false);
      alert(`Shift Closed Successfully!\nExpected Cash: ₹${result.expectedCash.toFixed(2)}\nDeclared Cash: ₹${result.shift.endCash.toFixed(2)}\nDifference: ₹${result.cashDifference.toFixed(2)}`);
    } catch (err) {
      setActionError(err.message || 'Failed to close shift.');
    }
  };

  const handleReopenShiftClick = async (shiftId) => {
    if (window.confirm('Are you sure you want to REOPEN this shift? All lock restrictions will be removed.')) {
      try {
        await reopenShift(shiftId);
        alert('Shift reopened successfully!');
      } catch (err) {
        alert(err.message || 'Failed to reopen shift.');
      }
    }
  };

  // Prepare chart data
  const paymentChartData = salesSummary
    ? [
        { name: 'Cash (नकद)', value: salesSummary.cashAmount, color: '#f97316' },
        { name: 'UPI (यूपीआई)', value: salesSummary.upiAmount, color: '#06b6d4' },
        { name: 'Card/POS (कार्ड)', value: salesSummary.posAmount, color: '#3b82f6' },
        { name: 'Credit (उधार)', value: salesSummary.creditAmount, color: '#e11d48' },
        { name: 'Testing (जांच)', value: salesSummary.testingTotalAmount, color: '#64748b' },
      ].filter((item) => item.value > 0)
    : [];

  const COLORS = ['#f97316', '#06b6d4', '#3b82f6', '#e11d48', '#64748b'];

  const formatCurrency = (val) => `₹${(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Dashboard Top bar */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shift Operations Center</h1>
          <p className="text-xs text-slate-500">
            Real-time fuel pump tracking / वास्तविक समय ईंधन पंप ट्रैकिंग
          </p>
        </div>

        {/* Shift Action Control Button */}
        <div className="flex items-center space-x-3">
          {activeShift ? (
            <button
              onClick={() => {
                setActionError('');
                setShowShiftActionModal(true);
              }}
              className="flex items-center space-x-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition-all"
            >
              <Lock className="h-4.5 w-4.5" />
              <span>Close Active Shift (शिफ्ट बंद करें)</span>
            </button>
          ) : (
            (user?.role === 'Owner' || user?.role === 'Manager') && (
              <button
                onClick={() => {
                  setActionError('');
                  setShowShiftActionModal(true);
                }}
                className="flex items-center space-x-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
              >
                <Unlock className="h-4.5 w-4.5" />
                <span>Open New Shift (शिफ्ट चालू करें)</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Warning if shift is closed */}
      {!activeShift && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-500 flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold">Shift Lock Alert (शिफ्ट लॉक अलर्ट)</h4>
            <p className="text-xs mt-0.5 opacity-90">
              No shift is currently active. The database is frozen. Managers or Owners must open a shift before entering new data.
            </p>
          </div>
        </div>
      )}

      {/* Dashboard Stat Cards */}
      {activeShift && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Today/Shift Total Sales */}
          <div className={`rounded-2xl border p-5 transition-all glass-panel shadow-sm hover:shadow-md`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Fuel Pumped <br />
                <span className="text-[10px] font-normal lowercase text-slate-400">कुल ईंधन बिक्री</span>
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <h3 className="mt-3 text-2xl font-bold">{formatCurrency(salesSummary?.finalTotalSale)}</h3>
            <p className="mt-1.5 text-xs text-slate-400">
              MS+HSD meter readings value
            </p>
          </div>

          {/* Card 2: MS Sales (Petrol) */}
          <div className="rounded-2xl border p-5 transition-all glass-panel shadow-sm hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                MS (Petrol) Sales <br />
                <span className="text-[10px] font-normal lowercase text-slate-400">पेट्रोल बिक्री (MS)</span>
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                <Fuel className="h-5 w-5" />
              </div>
            </div>
            <h3 className="mt-3 text-2xl font-bold">{formatCurrency(salesSummary?.msSale)}</h3>
            <p className="mt-1.5 text-xs text-slate-400">
              {salesSummary?.msQty.toFixed(2) || '0.00'} Liters sold
            </p>
          </div>

          {/* Card 3: HSD Sales (Diesel) */}
          <div className="rounded-2xl border p-5 transition-all glass-panel shadow-sm hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                HSD (Diesel) Sales <br />
                <span className="text-[10px] font-normal lowercase text-slate-400">डीजल बिक्री (HSD)</span>
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                <Droplet className="h-5 w-5" />
              </div>
            </div>
            <h3 className="mt-3 text-2xl font-bold">{formatCurrency(salesSummary?.hsdSale)}</h3>
            <p className="mt-1.5 text-xs text-slate-400">
              {salesSummary?.hsdQty.toFixed(2) || '0.00'} Liters sold
            </p>
          </div>

          {/* Card 4: Counter Cash Balance */}
          <div className="rounded-2xl border p-5 transition-all glass-panel shadow-sm hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Counter Cash Balance <br />
                <span className="text-[10px] font-normal lowercase text-slate-400">काउंटर नकद बैलेंस</span>
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
            <h3 className="mt-3 text-2xl font-bold">{formatCurrency(activeShift?.expectedCash)}</h3>
            <p className="mt-1.5 text-xs text-slate-400">
              Expected physical cash in drawer
            </p>
          </div>
        </div>
      )}

      {/* Secondary Metrics Row */}
      {activeShift && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 5: Fresh Cash Sales */}
          <div className="rounded-2xl border p-4 glass-panel shadow-sm">
            <div className="flex justify-between items-center text-xs text-slate-500">
              <span>Fresh Cash Sales (ताजा नकद बिक्री)</span>
              <IndianRupee className="h-4 w-4 text-orange-500" />
            </div>
            <h4 className="text-xl font-bold mt-2">{formatCurrency(activeShift?.freshCashSales)}</h4>
          </div>

          {/* Card 6: Return Credit Cash */}
          <div className="rounded-2xl border p-4 glass-panel shadow-sm">
            <div className="flex justify-between items-center text-xs text-slate-500">
              <span>Return Credit Cash (उधार वसूली)</span>
              <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
            </div>
            <h4 className="text-xl font-bold mt-2">{formatCurrency(activeShift?.returnCreditCash)}</h4>
          </div>

          {/* Card 7: Total UPI */}
          <div className="rounded-2xl border p-4 glass-panel shadow-sm">
            <div className="flex justify-between items-center text-xs text-slate-500">
              <span>Total UPI (यूपीआई भुगतान)</span>
              <Smartphone className="h-4 w-4 text-cyan-500" />
            </div>
            <h4 className="text-xl font-bold mt-2">{formatCurrency(salesSummary?.upiAmount)}</h4>
          </div>

          {/* Card 8: Total POS / Credit / Testing */}
          <div className="rounded-2xl border p-4 glass-panel shadow-sm">
            <div className="flex justify-between items-center text-xs text-slate-500">
              <span>Total Credit Today (आज का उधार)</span>
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </div>
            <h4 className="text-xl font-bold mt-2">{formatCurrency(salesSummary?.creditAmount)}</h4>
          </div>
        </div>
      )}

      {/* Main content grid: Chart and recent sales */}
      {activeShift && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Pie Chart Card */}
          <div className="rounded-2xl border glass-panel p-6 shadow-sm lg:col-span-5 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-semibold">Payment Breakup</h3>
              <p className="text-xs text-slate-500">Breakdown of active shift sales modes</p>
            </div>

            <div className="h-64 mt-4">
              {paymentChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {paymentChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-500 font-medium">
                  No sales recorded yet
                </div>
              )}
            </div>
          </div>

          {/* Recent Sales entries card */}
          <div className="rounded-2xl border glass-panel p-6 shadow-sm lg:col-span-7">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Recent Shift Entries</h3>
                <p className="text-xs text-slate-500">Last 5 fuel sales recorded</p>
              </div>
              <Activity className="h-5 w-5 text-slate-400" />
            </div>

            <div className="mt-5 space-y-4">
              {recentSales.length > 0 ? (
                recentSales.map((sale) => (
                  <div key={sale._id} className="flex justify-between items-center border-b border-slate-500/5 pb-3 last:border-0 last:pb-0">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold">{sale.salesmanName}</span>
                        {sale.status === 'PendingApproval' && (
                          <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-bold text-rose-500">
                            Mismatch Alert
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex space-x-3">
                        <span>MS: {sale.ms.quantity.toFixed(1)} L</span>
                        <span>HSD: {sale.hsd.quantity.toFixed(1)} L</span>
                        <span>Testing: ₹{sale.testingTotalAmount.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-200">{formatCurrency(sale.finalTotalSale)}</span>
                      <p className="text-[9px] text-slate-500 mt-0.5">
                        {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex h-40 items-center justify-center text-xs text-slate-500 font-medium border border-dashed border-slate-500/25 rounded-xl">
                  No sales logged during this shift
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Owner-only closed shift reopening panel */}
      {!activeShift && user?.role === 'Owner' && (
        <div className="rounded-2xl border glass-panel p-6 shadow-sm">
          <h3 className="text-lg font-semibold">Closed Shift Reopening Console</h3>
          <p className="text-xs text-slate-500">As the Owner, you can reopen a shift to make modifications</p>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-500/10 text-slate-500 font-medium uppercase tracking-wider">
                  <th className="py-3 px-4">Shift No.</th>
                  <th className="py-3 px-4">Opened By</th>
                  <th className="py-3 px-4">Closed By</th>
                  <th className="py-3 px-4">Declared Cash</th>
                  <th className="py-3 px-4">Closed Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-500/5">
                {shiftHistory.map((sh) => (
                  <tr key={sh._id} className="hover:bg-slate-500/5">
                    <td className="py-3.5 px-4 font-semibold">Shift #{sh.shiftNumber}</td>
                    <td className="py-3.5 px-4">{sh.openedBy?.name}</td>
                    <td className="py-3.5 px-4">{sh.closedBy?.name || 'N/A'}</td>
                    <td className="py-3.5 px-4 font-semibold">{formatCurrency(sh.endCash)}</td>
                    <td className="py-3.5 px-4">
                      {new Date(sh.endTime || sh.updatedAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleReopenShiftClick(sh._id)}
                        className="rounded-lg bg-orange-600/15 px-3 py-1.5 text-[11px] font-bold text-orange-500 hover:bg-orange-600 hover:text-white transition-colors"
                      >
                        Reopen (पुनः खोलें)
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SHIFT CONTROL MODAL (Open/Close shift) */}
      {showShiftActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#12141c] p-6 text-slate-200 shadow-2xl">
            <h3 className="text-lg font-bold">
              {activeShift ? 'Close Shift (शिफ्ट बंद करें)' : 'Open New Shift (नई शिफ्ट शुरू करें)'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {activeShift
                ? 'Declare closing cash. Mismatches will be logged under audit trail.'
                : 'Enter initial cash in counter to open standard tracking.'}
            </p>

            {actionError && (
              <div className="mt-4 flex items-start space-x-2 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form
              onSubmit={activeShift ? handleCloseShiftSubmit : handleOpenShiftSubmit}
              className="mt-5 space-y-4"
            >
              {activeShift ? (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-400">EXPECTED COUNTER CASH</label>
                    <div className="mt-1 text-xl font-extrabold text-slate-100 bg-slate-900 px-3 py-2.5 rounded-lg border border-slate-800">
                      {formatCurrency(activeShift.expectedCash)}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400">DECLARED PHYSICAL CASH (₹)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. 45000"
                      value={endCashInput}
                      onChange={(e) => setEndCashInput(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-slate-850 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-rose-500"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-slate-400">STARTING COUNTER CASH (₹)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 5000"
                    value={startCashInput}
                    onChange={(e) => setStartCashInput(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-850 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-400">REMARKS / टिप्पणी</label>
                <textarea
                  rows="3"
                  placeholder="e.g. Shift starting details, notes, etc."
                  value={shiftRemarks}
                  onChange={(e) => setShiftRemarks(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-850 bg-slate-900 p-3 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowShiftActionModal(false)}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-750"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-md ${
                    activeShift
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/10'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10'
                  }`}
                >
                  {activeShift ? 'Verify & Close Shift' : 'Initiate Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
