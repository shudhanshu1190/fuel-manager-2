import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../utils/api.js';
import {
  Fuel,
  TrendingUp,
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle,
  HelpCircle,
  IndianRupee,
} from 'lucide-react';

const SalesEntry = () => {
  const { user, activeShift } = useAuth();

  // Form states
  const [salesmanName, setSalesmanName] = useState('');
  
  // MS Fields
  const [msOld, setMsOld] = useState('');
  const [msClosing, setMsClosing] = useState('');
  const [msRate, setMsRate] = useState('');
  const [msTesting, setMsTesting] = useState('0');

  // HSD Fields
  const [hsdOld, setHsdOld] = useState('');
  const [hsdClosing, setHsdClosing] = useState('');
  const [hsdRate, setHsdRate] = useState('');
  const [hsdTesting, setHsdTesting] = useState('0');

  // Payment Breakup
  const [cashAmt, setCashAmt] = useState('0');
  const [upiAmt, setUpiAmt] = useState('0');
  const [creditAmt, setCreditAmt] = useState('0');
  const [posAmt, setPosAmt] = useState('0');

  // Credit Customers Sub-form
  const [creditDetails, setCreditDetails] = useState([]);
  const [showCreditForm, setShowCreditForm] = useState(false);

  // Mismatch overrides
  const [overrideMismatch, setOverrideMismatch] = useState(false);
  const [remarks, setRemarks] = useState('');

  // Status/Error states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Auto-load previous closing readings from history
  useEffect(() => {
    loadPreviousReadings();
  }, [activeShift]);

  const loadPreviousReadings = async () => {
    try {
      const sales = await api.get('/sales');
      if (sales.length > 0) {
        // Find last sales with readings
        const lastSale = sales[0];
        setMsOld(String(lastSale.ms.closingReading));
        setHsdOld(String(lastSale.hsd.closingReading));
        setMsRate(String(lastSale.ms.rate));
        setHsdRate(String(lastSale.hsd.rate));
      }
    } catch (err) {
      console.error('Error fetching historical readings:', err.message);
    }
  };

  // Live calculations
  const msQty = Math.max(0, Number(msClosing) - Number(msOld));
  const msTotalSale = msQty * Number(msRate);
  const msTestingAmt = Number(msTesting) * Number(msRate);

  const hsdQty = Math.max(0, Number(hsdClosing) - Number(hsdOld));
  const hsdTotalSale = hsdQty * Number(hsdRate);
  const hsdTestingAmt = Number(hsdTesting) * Number(hsdRate);

  const finalTotalSale = msTotalSale + hsdTotalSale;
  const testingTotalAmount = msTestingAmt + hsdTestingAmt;

  const totalPaid =
    Number(cashAmt) +
    Number(upiAmt) +
    Number(creditAmt) +
    Number(posAmt);

  const totalCalculated = totalPaid + testingTotalAmount;
  const difference = finalTotalSale - totalCalculated;
  const isMismatch = Math.abs(difference) > 0.01;

  // Credit items sum validation
  const sumCreditItems = creditDetails.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const creditMismatchesSum = Math.abs(sumCreditItems - Number(creditAmt)) > 0.01;

  // Manage credit details list
  const addCreditDetail = () => {
    setCreditDetails([
      ...creditDetails,
      { customerName: '', mobileNumber: '', vehicleNumber: '', amount: '', notes: '' },
    ]);
  };

  const removeCreditDetail = (index) => {
    setCreditDetails(creditDetails.filter((_, i) => i !== index));
  };

  const updateCreditDetail = (index, field, value) => {
    const updated = [...creditDetails];
    updated[index][field] = value;
    setCreditDetails(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!activeShift) {
      setErrorMsg('No shift is open. Please open a shift from the dashboard first.');
      return;
    }

    if (!salesmanName) {
      setErrorMsg('Please enter the Salesman Name.');
      return;
    }

    if (msQty < 0 || hsdQty < 0) {
      setErrorMsg('Closing reading cannot be less than Old reading.');
      return;
    }

    if (isMismatch && user.role !== 'Owner') {
      setErrorMsg(`Payment mismatch of ₹${difference.toFixed(2)} detected. Only the Owner can approve entries with differences.`);
      return;
    }

    if (isMismatch && user.role === 'Owner' && !overrideMismatch) {
      setErrorMsg(`Payment mismatch of ₹${difference.toFixed(2)} detected. You must acknowledge the mismatch via the check box below to save.`);
      return;
    }

    if (Number(creditAmt) > 0 && creditMismatchesSum) {
      setErrorMsg(`The sum of Credit Ledger entries (₹${sumCreditItems.toFixed(2)}) must exactly match the Credit Payment component (₹${Number(creditAmt).toFixed(2)}).`);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        salesmanName,
        ms: {
          oldReading: Number(msOld),
          closingReading: Number(msClosing),
          rate: Number(msRate),
          testingQuantity: Number(msTesting),
        },
        hsd: {
          oldReading: Number(hsdOld),
          closingReading: Number(hsdClosing),
          rate: Number(hsdRate),
          testingQuantity: Number(hsdTesting),
        },
        paymentBreakup: {
          cashAmount: Number(cashAmt),
          upiAmount: Number(upiAmt),
          creditAmount: Number(creditAmt),
          posAmount: Number(posAmt),
        },
        credits: Number(creditAmt) > 0 ? creditDetails.map((c) => ({ ...c, amount: Number(c.amount) })) : [],
        overrideMismatch,
        remarks,
      };

      await api.post('/sales', payload);

      setSuccessMsg('Sales record saved successfully!');
      
      // Reset form variables
      setSalesmanName('');
      setMsClosing('');
      setHsdClosing('');
      setMsTesting('0');
      setHsdTesting('0');
      setCashAmt('0');
      setUpiAmt('0');
      setCreditAmt('0');
      setPosAmt('0');
      setCreditDetails([]);
      setShowCreditForm(false);
      setOverrideMismatch(false);
      setRemarks('');
      
      // Reload historical readings
      loadPreviousReadings();
    } catch (err) {
      setErrorMsg(err.message || 'Error saving sales entry');
    } finally {
      setLoading(false);
    }
  };

  const formatRupee = (val) => `₹${(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sales Entry Form</h1>
        <p className="text-xs text-slate-500">
          Petrol & Diesel combined shift entry / पेट्रोल और डीजल संयुक्त प्रविष्टि
        </p>
      </div>

      {!activeShift && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-500">
          <AlertTriangle className="h-5 w-5 inline mr-2 align-text-bottom" />
          <strong>Freeze Mode:</strong> You cannot submit sales because there is no open shift currently.
        </div>
      )}

      {successMsg && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-500">
          <CheckCircle className="h-5 w-5 inline mr-2 align-text-bottom" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-500">
          <AlertTriangle className="h-5 w-5 inline mr-2 align-text-bottom" />
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-12">
        {/* Left Side: Readings */}
        <div className="space-y-6 lg:col-span-7">
          {/* General info */}
          <div className="rounded-2xl border glass-panel p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              General Info / सामान्य जानकारी
            </h3>
            <div>
              <label className="text-xs font-semibold text-slate-400">
                SALESMAN NAME / सेल्समैन का नाम <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sanjeev Kumar"
                value={salesmanName}
                onChange={(e) => setSalesmanName(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-850 bg-slate-900 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Petrol Card */}
          <div className="rounded-2xl border border-orange-500/10 bg-orange-500/5 p-6 shadow-sm space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-24 w-24 bg-orange-500/5 rounded-bl-full pointer-events-none" />
            <div className="flex items-center space-x-2">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-orange-500 text-white font-bold text-xs">
                MS
              </div>
              <h3 className="font-bold text-slate-200">PETROL (MS) / पेट्रोल</h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="text-[10px] font-semibold text-slate-400">OLD READING / पुराना</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={msOld}
                  onChange={(e) => setMsOld(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-850 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400">CLOSING / नया रीडिंग</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={msClosing}
                  onChange={(e) => setMsClosing(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-850 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400">RATE / दर (₹)</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={msRate}
                  onChange={(e) => setMsRate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-850 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400">TESTING QTY / जांच (L)</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={msTesting}
                  onChange={(e) => setMsTesting(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-850 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-xs bg-black/20 p-3 rounded-lg border border-slate-500/5">
              <span className="text-slate-400">Calculated MS Sale:</span>
              <span className="font-bold text-slate-200">
                {msQty.toFixed(2)} L × ₹{Number(msRate || 0).toFixed(2)} = <span className="text-orange-400">{formatRupee(msTotalSale)}</span>
              </span>
            </div>
          </div>

          {/* Diesel Card */}
          <div className="rounded-2xl border border-blue-500/10 bg-blue-500/5 p-6 shadow-sm space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-24 w-24 bg-blue-500/5 rounded-bl-full pointer-events-none" />
            <div className="flex items-center space-x-2">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-500 text-white font-bold text-xs">
                HSD
              </div>
              <h3 className="font-bold text-slate-200">DIESEL (HSD) / डीजल</h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="text-[10px] font-semibold text-slate-400">OLD READING / पुराना</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={hsdOld}
                  onChange={(e) => setHsdOld(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-850 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400">CLOSING / नया रीडिंग</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={hsdClosing}
                  onChange={(e) => setHsdClosing(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-850 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400">RATE / दर (₹)</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={hsdRate}
                  onChange={(e) => setHsdRate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-850 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400">TESTING QTY / जांच (L)</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={hsdTesting}
                  onChange={(e) => setHsdTesting(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-850 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-xs bg-black/20 p-3 rounded-lg border border-slate-500/5">
              <span className="text-slate-400">Calculated HSD Sale:</span>
              <span className="font-bold text-slate-200">
                {hsdQty.toFixed(2)} L × ₹{Number(hsdRate || 0).toFixed(2)} = <span className="text-blue-400">{formatRupee(hsdTotalSale)}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Breakups & Verification */}
        <div className="space-y-6 lg:col-span-5">
          {/* Payment Breakup Card */}
          <div className="rounded-2xl border glass-panel p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Payment Breakup / भुगतान विवरण
            </h3>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400">CASH AMOUNT / नकद (₹)</label>
                <input
                  type="number"
                  step="any"
                  value={cashAmt}
                  onChange={(e) => setCashAmt(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-850 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400">UPI AMOUNT / यूपीआई (₹)</label>
                <input
                  type="number"
                  step="any"
                  value={upiAmt}
                  onChange={(e) => setUpiAmt(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-850 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400">POS / CARD AMOUNT / कार्ड (₹)</label>
                <input
                  type="number"
                  step="any"
                  value={posAmt}
                  onChange={(e) => setPosAmt(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-850 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400">CREDIT AMOUNT / उधार (₹)</label>
                <input
                  type="number"
                  step="any"
                  value={creditAmt}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCreditAmt(val);
                    if (Number(val) > 0) {
                      setShowCreditForm(true);
                      if (creditDetails.length === 0) addCreditDetail();
                    } else {
                      setShowCreditForm(false);
                      setCreditDetails([]);
                    }
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-850 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Credit Sub-Form List */}
          {showCreditForm && (
            <div className="rounded-2xl border border-rose-500/10 bg-rose-500/5 p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400">
                  Credit Customers / उधार ग्राहक विवरण
                </h3>
                <button
                  type="button"
                  onClick={addCreditDetail}
                  className="flex items-center space-x-1 text-[11px] font-bold text-orange-500 bg-orange-500/10 px-2.5 py-1 rounded"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Customer</span>
                </button>
              </div>

              {creditDetails.map((detail, index) => (
                <div key={index} className="border-t border-slate-800 pt-3 mt-3 first:border-0 first:pt-0 first:mt-0 space-y-2 relative">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-bold">Customer #{index + 1}</span>
                    {creditDetails.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCreditDetail(index)}
                        className="text-rose-500 hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid gap-2 grid-cols-2">
                    <input
                      type="text"
                      required
                      placeholder="Customer Name"
                      value={detail.customerName}
                      onChange={(e) => updateCreditDetail(index, 'customerName', e.target.value)}
                      className="rounded border border-slate-800 bg-slate-900 p-2 text-xs outline-none"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Mobile"
                      value={detail.mobileNumber}
                      onChange={(e) => updateCreditDetail(index, 'mobileNumber', e.target.value)}
                      className="rounded border border-slate-800 bg-slate-900 p-2 text-xs outline-none"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Vehicle Number"
                      value={detail.vehicleNumber}
                      onChange={(e) => updateCreditDetail(index, 'vehicleNumber', e.target.value)}
                      className="rounded border border-slate-800 bg-slate-900 p-2 text-xs outline-none"
                    />
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="Credit Amount (₹)"
                      value={detail.amount}
                      onChange={(e) => updateCreditDetail(index, 'amount', e.target.value)}
                      className="rounded border border-slate-800 bg-slate-900 p-2 text-xs outline-none"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Remarks / Vehicle brand (optional)"
                    value={detail.notes}
                    onChange={(e) => updateCreditDetail(index, 'notes', e.target.value)}
                    className="w-full rounded border border-slate-800 bg-slate-900 p-2 text-[11px] outline-none"
                  />
                </div>
              ))}

              <div className="text-[11px] flex justify-between border-t border-slate-800 pt-2 font-medium">
                <span className="text-slate-400">Total Credit Details Value:</span>
                <span className={creditMismatchesSum ? 'text-rose-500 font-bold' : 'text-slate-300 font-semibold'}>
                  {formatRupee(sumCreditItems)} / {formatRupee(Number(creditAmt))}
                </span>
              </div>
              {creditMismatchesSum && (
                <p className="text-[9px] text-rose-400/90 leading-tight">
                  *The sum of credit forms must exactly match the Credit Amount field.
                </p>
              )}
            </div>
          )}

          {/* Verification Box */}
          <div className="rounded-2xl border glass-panel p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Audit Calculator / ऑडिट सत्यापन
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Final Fuel Value (बिक्री मूल्य):</span>
                <span className="font-bold">{formatRupee(finalTotalSale)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Paid (प्राप्त राशि):</span>
                <span className="font-semibold">{formatRupee(totalPaid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Testing Fuel Value (जांच मूल्य):</span>
                <span className="font-semibold text-slate-400">{formatRupee(testingTotalAmount)}</span>
              </div>

              <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-sm">
                <span>Account Balance Delta:</span>
                <span className={isMismatch ? 'text-rose-500' : 'text-emerald-500'}>
                  {isMismatch ? `₹${difference.toFixed(2)} Mismatch` : '₹0.00 Balanced'}
                </span>
              </div>
            </div>

            {/* Mismatch warnings */}
            {isMismatch && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-400 space-y-2">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-4.5 w-4.5 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Validation Error:</strong> Cash + UPI + Credit + POS + Testing Amount must equal the Final Total Sale. Save is locked.
                  </span>
                </div>
                {user.role === 'Owner' ? (
                  <div className="border-t border-rose-500/20 pt-2 space-y-2">
                    <label className="flex items-center space-x-2 font-semibold text-slate-200">
                      <input
                        type="checkbox"
                        checked={overrideMismatch}
                        onChange={(e) => setOverrideMismatch(e.target.checked)}
                        className="rounded accent-orange-500"
                      />
                      <span>Owner Override Mismatch (स्वीकार करें)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Explain reason for discrepancy..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full rounded border border-rose-500/30 bg-rose-950/20 p-2 text-xs text-slate-100 placeholder-rose-400 outline-none"
                    />
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400">
                    *Please contact the Owner राजेश शर्मा to approve this correction. Salesmen cannot override mismatches.
                  </p>
                )}
              </div>
            )}

            {/* Save Button */}
            <button
              type="submit"
              disabled={loading || !activeShift || (isMismatch && user.role !== 'Owner') || (isMismatch && !overrideMismatch) || (Number(creditAmt) > 0 && creditMismatchesSum)}
              className="w-full flex justify-center rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/10 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving entry...' : 'Freeze & Save Entry / सुरक्षित करें'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SalesEntry;
