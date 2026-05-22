import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import { exportToExcel, exportToPDF } from '../utils/export.js';
import {
  Calendar,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  RefreshCw,
  TrendingUp,
  Droplet,
  Fuel,
  Wallet,
  ArrowRightLeft,
  Users,
} from 'lucide-react';

const Reports = () => {
  const [reportTab, setReportTab] = useState('sales'); // sales, counter, credit, recovery, salesman, shift
  
  // Date filters
  const [datePreset, setDatePreset] = useState('today'); // today, yesterday, weekly, monthly, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Report state
  const [reportData, setReportData] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Set date ranges based on preset selection
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (datePreset === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      setStartDate(start.toISOString());
      setEndDate(end.toISOString());
    } else if (datePreset === 'yesterday') {
      const start = new Date();
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      setStartDate(start.toISOString());
      setEndDate(end.toISOString());
    } else if (datePreset === 'weekly') {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      setStartDate(start.toISOString());
      setEndDate(end.toISOString());
    } else if (datePreset === 'monthly') {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      setStartDate(start.toISOString());
      setEndDate(end.toISOString());
    }
  }, [datePreset]);

  // Load report data when tabs or dates change
  useEffect(() => {
    if (startDate && endDate) {
      fetchReport();
    }
  }, [reportTab, startDate, endDate]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      switch (reportTab) {
        case 'sales':
          endpoint = '/reports/sales';
          break;
        case 'counter':
          endpoint = '/reports/counter';
          break;
        case 'credit':
          endpoint = '/reports/credit';
          break;
        case 'recovery':
          endpoint = '/reports/recovery';
          break;
        case 'salesman':
          endpoint = '/reports/salesman-wise';
          break;
        case 'shift':
          endpoint = '/reports/shifts';
          break;
      }

      const qParams = `startDate=${startDate}&endDate=${endDate}`;
      const data = await api.get(`${endpoint}?${qParams}`);
      
      if (reportTab === 'salesman') {
        setReportData(data);
        setSummaryData(null);
      } else {
        setReportData(data[reportTab] || data.transactions || data.recoveries || data.credits || data.sales || []);
        setSummaryData(data.summary || null);
      }
    } catch (err) {
      console.error('Error fetching report:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Perform client-side text filtering for search queries
  const getFilteredData = () => {
    if (!searchQuery) return reportData;
    const regex = new RegExp(searchQuery, 'i');

    return reportData.filter((row) => {
      switch (reportTab) {
        case 'sales':
          return regex.test(row.salesmanName) || regex.test(row.status);
        case 'counter':
          return regex.test(row.type) || regex.test(row.description) || regex.test(row.enteredBy?.name);
        case 'credit':
          return regex.test(row.customerName) || regex.test(row.vehicleNumber) || regex.test(row.salesmanName);
        case 'recovery':
          return regex.test(row.creditLedgerId?.customerName) || regex.test(row.creditLedgerId?.vehicleNumber) || regex.test(row.paymentMode);
        case 'salesman':
          return regex.test(row.salesmanName);
        case 'shift':
          return regex.test(String(row.shiftNumber)) || regex.test(row.status) || regex.test(row.openedBy?.name);
        default:
          return true;
      }
    });
  };

  const filtered = getFilteredData();

  // Export handlers
  const handleExcelExport = () => {
    if (filtered.length === 0) {
      alert('No data to export!');
      return;
    }

    let flatData = [];
    switch (reportTab) {
      case 'sales':
        flatData = filtered.map((r) => ({
          Date: new Date(r.createdAt).toLocaleDateString(),
          Salesman: r.salesmanName,
          'MS Sold (L)': r.ms.quantity,
          'MS Rate': r.ms.rate,
          'MS Value': r.ms.totalSale,
          'HSD Sold (L)': r.hsd.quantity,
          'HSD Rate': r.hsd.rate,
          'HSD Value': r.hsd.totalSale,
          'Total Fuel Value': r.finalTotalSale,
          Cash: r.paymentBreakup.cashAmount,
          UPI: r.paymentBreakup.upiAmount,
          Credit: r.paymentBreakup.creditAmount,
          Card: r.paymentBreakup.posAmount,
          Status: r.status,
        }));
        break;
      case 'counter':
        flatData = filtered.map((r) => ({
          Date: new Date(r.createdAt).toLocaleString(),
          Type: r.type,
          Amount: r.amount,
          Description: r.description,
          Operator: r.enteredBy?.name,
        }));
        break;
      case 'credit':
        flatData = filtered.map((r) => ({
          Date: new Date(r.date).toLocaleDateString(),
          Customer: r.customerName,
          Mobile: r.mobileNumber,
          Vehicle: r.vehicleNumber,
          'Issued Amt': r.amount,
          'Remaining Balance': r.remainingBalance,
          Salesman: r.salesmanName,
          Status: r.status,
        }));
        break;
      case 'recovery':
        flatData = filtered.map((r) => ({
          Date: new Date(r.date).toLocaleString(),
          Customer: r.creditLedgerId?.customerName,
          Vehicle: r.creditLedgerId?.vehicleNumber,
          'Recovered Amt': r.amountPaid,
          Mode: r.paymentMode,
          Receiver: r.receiver?.name,
          Remarks: r.remarks,
        }));
        break;
      case 'salesman':
        flatData = filtered.map((r) => ({
          Salesman: r.salesmanName,
          'Total Fuel Sold (₹)': r.totalSales,
          Cash: r.cash,
          UPI: r.upi,
          POS: r.pos,
          Credit: r.credit,
          'Credits Count': r.creditsCount,
        }));
        break;
      case 'shift':
        flatData = filtered.map((r) => ({
          Shift: `Shift #${r.shiftNumber}`,
          Start: new Date(r.startTime).toLocaleString(),
          End: r.endTime ? new Date(r.endTime).toLocaleString() : 'Active',
          'Opening Cash': r.startCash,
          'Closing Declared': r.endCash,
          Status: r.status,
        }));
        break;
    }

    exportToExcel(flatData, `fuelledger_${reportTab}_report`);
  };

  const handlePDFExport = () => {
    if (filtered.length === 0) {
      alert('No data to export!');
      return;
    }

    let title = '';
    let headers = [];
    let body = [];
    let summaryLines = [];

    const dateRangeStr = `${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`;

    switch (reportTab) {
      case 'sales':
        title = `Daily Sales Report (${dateRangeStr})`;
        headers = ['Date', 'Salesman', 'MS (L)', 'HSD (L)', 'Total Sale', 'Cash', 'UPI', 'Credit', 'POS'];
        body = filtered.map((r) => [
          new Date(r.createdAt).toLocaleDateString(),
          r.salesmanName,
          r.ms.quantity.toFixed(1),
          r.hsd.quantity.toFixed(1),
          formatRupeeNoSym(r.finalTotalSale),
          formatRupeeNoSym(r.paymentBreakup.cashAmount),
          formatRupeeNoSym(r.paymentBreakup.upiAmount),
          formatRupeeNoSym(r.paymentBreakup.creditAmount),
          formatRupeeNoSym(r.paymentBreakup.posAmount),
        ]);
        if (summaryData) {
          summaryLines = [
            `Total Fuel Value Sold: ${formatRupee(summaryData.finalTotalSale)}`,
            `MS Qty Pumped: ${summaryData.msQty.toFixed(2)} Liters (${formatRupee(summaryData.msSale)})`,
            `HSD Qty Pumped: ${summaryData.hsdQty.toFixed(2)} Liters (${formatRupee(summaryData.hsdSale)})`,
            `Payment Breakups -> Cash: ${formatRupee(summaryData.cashAmount)} | UPI: ${formatRupee(summaryData.upiAmount)} | Credit: ${formatRupee(summaryData.creditAmount)} | Card: ${formatRupee(summaryData.posAmount)}`,
            `Fuel Testing returned to tank: ${summaryData.msTestingQty.toFixed(1)}L MS / ${summaryData.hsdTestingQty.toFixed(1)}L HSD (Total Value: ${formatRupee(summaryData.testingTotalAmount)})`,
          ];
        }
        break;
      case 'counter':
        title = `Counter Cash Flow Ledger (${dateRangeStr})`;
        headers = ['Timestamp', 'Type', 'Amount', 'Description', 'Operator'];
        body = filtered.map((r) => [
          new Date(r.createdAt).toLocaleString(),
          r.type,
          formatRupeeNoSym(r.amount),
          r.description,
          r.enteredBy?.name,
        ]);
        if (summaryData) {
          summaryLines = [
            `Total Cash Inflows (Fresh Sales + Recoveries): ${formatRupee(summaryData.netInflow)}`,
            `Total Cash Outflows (Deposits + Transfers + Expenses): ${formatRupee(summaryData.netOutflow)}`,
            `  - Expenses: ${formatRupee(summaryData.expenses)}`,
            `  - Bank Deposits: ${formatRupee(summaryData.bankDeposits)}`,
            `  - Transfers to Owner: ${formatRupee(summaryData.cashTransfers)}`,
          ];
        }
        break;
      case 'credit':
        title = `Issued Customer Credit Report (${dateRangeStr})`;
        headers = ['Date', 'Customer Name', 'Vehicle No.', 'Issued Amount', 'Balance Left', 'Status', 'Salesman'];
        body = filtered.map((r) => [
          new Date(r.date).toLocaleDateString(),
          r.customerName,
          r.vehicleNumber,
          formatRupeeNoSym(r.amount),
          formatRupeeNoSym(r.remainingBalance),
          r.status,
          r.salesmanName,
        ]);
        if (summaryData) {
          summaryLines = [
            `Total Credits Issued: ${formatRupee(summaryData.totalAmountIssued)}`,
            `Total Outstanding Balance Unpaid: ${formatRupee(summaryData.totalRemainingBalance)}`,
            `Total Credit Repaid: ${formatRupee(summaryData.totalPaid)}`,
            `Accounts count -> Paid: ${summaryData.paidCount} | Pending: ${summaryData.pendingCount}`,
          ];
        }
        break;
      case 'recovery':
        title = `Credit Recovery Payments Collected (${dateRangeStr})`;
        headers = ['Timestamp', 'Customer', 'Vehicle No.', 'Amount Collected', 'Mode', 'Collected By'];
        body = filtered.map((r) => [
          new Date(r.date).toLocaleString(),
          r.creditLedgerId?.customerName,
          r.creditLedgerId?.vehicleNumber,
          formatRupeeNoSym(r.amountPaid),
          r.paymentMode,
          r.receiver?.name,
        ]);
        if (summaryData) {
          summaryLines = [
            `Total Debt Recovery Collected: ${formatRupee(summaryData.totalRecovered)}`,
            `Breakdown -> Cash: ${formatRupee(summaryData.cash)} | UPI: ${formatRupee(summaryData.upi)} | Card: ${formatRupee(summaryData.pos)}`,
          ];
        }
        break;
      case 'salesman':
        title = `Salesman Performance Report (${dateRangeStr})`;
        headers = ['Salesman', 'Total Fuel Pumped', 'Cash', 'UPI', 'POS', 'Credit', 'Credits Count'];
        body = filtered.map((r) => [
          r.salesmanName,
          formatRupeeNoSym(r.totalSales),
          formatRupeeNoSym(r.cash),
          formatRupeeNoSym(r.upi),
          formatRupeeNoSym(r.pos),
          formatRupeeNoSym(r.credit),
          String(r.creditsCount),
        ]);
        break;
      case 'shift':
        title = `Shift Closures Audit Report (${dateRangeStr})`;
        headers = ['Shift', 'Opened', 'Closed', 'Opening Cash', 'Closing Declared', 'Status'];
        body = filtered.map((r) => [
          `Shift #${r.shiftNumber}`,
          new Date(r.startTime).toLocaleString(),
          r.endTime ? new Date(r.endTime).toLocaleString() : 'Open',
          formatRupeeNoSym(r.startCash),
          formatRupeeNoSym(r.endCash),
          r.status,
        ]);
        break;
    }

    exportToPDF({
      title,
      headers,
      body,
      summary: summaryLines,
      fileName: `fuelledger_${reportTab}_report`,
    });
  };

  const formatRupee = (val) => `₹${(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatRupeeNoSym = (val) => (val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit & Business Reports</h1>
          <p className="text-xs text-slate-500">
            Generate printable shifts, sales, and counter flow sheets / पंप रिपोर्ट और ऑडिट
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleExcelExport}
            className="flex items-center space-x-1.5 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:border-slate-700 hover:text-white"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
            <span>Excel Export</span>
          </button>
          <button
            onClick={handlePDFExport}
            className="flex items-center space-x-1.5 rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-orange-700 shadow-md shadow-orange-600/10"
          >
            <FileText className="h-4 w-4" />
            <span>Print PDF</span>
          </button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex border-b border-slate-550/10 overflow-x-auto pb-px">
        {[
          { id: 'sales', label: 'Sales Report', hindi: 'बिक्री रिपोर्ट' },
          { id: 'counter', label: 'Counter Cash', hindi: 'काउंटर नकदी' },
          { id: 'credit', label: 'Credits Issued', hindi: 'उधार खाता' },
          { id: 'recovery', label: 'Recoveries', hindi: 'वसूली रिपोर्ट' },
          { id: 'salesman', label: 'Salesman Wise', hindi: 'सेल्समैन अनुसार' },
          { id: 'shift', label: 'Shift Closings', hindi: 'शिफ्ट क्लोजिंग' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setReportTab(tab.id);
              setSearchQuery('');
            }}
            className={`whitespace-nowrap border-b-2 px-5 py-3 text-xs font-bold leading-none transition-all flex flex-col items-center ${
              reportTab === tab.id
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{tab.label}</span>
            <span className="text-[9px] font-normal opacity-70 mt-0.5">{tab.hindi}</span>
          </button>
        ))}
      </div>

      {/* Filter Options Row */}
      <div className="rounded-2xl border glass-panel p-5 shadow-sm grid gap-4 sm:grid-cols-12 items-center">
        {/* Preset Select */}
        <div className="sm:col-span-3">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Time Preset</label>
          <select
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value)}
            className="w-full rounded-lg border border-slate-850 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none"
          >
            <option value="today">Today (आज)</option>
            <option value="yesterday">Yesterday (कल)</option>
            <option value="weekly">Last 7 Days (हफ़्ते भर)</option>
            <option value="monthly">Last 30 Days (महीने भर)</option>
            <option value="custom">Custom Range (मैनुअल)</option>
          </select>
        </div>

        {/* Start Date */}
        <div className="sm:col-span-3">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Start Date</label>
          <input
            type="date"
            disabled={datePreset !== 'custom'}
            value={startDate ? startDate.split('T')[0] : ''}
            onChange={(e) => {
              const d = new Date(e.target.value);
              d.setHours(0,0,0,0);
              setStartDate(d.toISOString());
            }}
            className="w-full rounded-lg border border-slate-850 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none disabled:opacity-40"
          />
        </div>

        {/* End Date */}
        <div className="sm:col-span-3">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">End Date</label>
          <input
            type="date"
            disabled={datePreset !== 'custom'}
            value={endDate ? endDate.split('T')[0] : ''}
            onChange={(e) => {
              const d = new Date(e.target.value);
              d.setHours(23,59,59,999);
              setEndDate(d.toISOString());
            }}
            className="w-full rounded-lg border border-slate-850 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none disabled:opacity-40"
          />
        </div>

        {/* Search Filter */}
        <div className="sm:col-span-3 relative mt-4 sm:mt-0">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Filter List</label>
          <span className="absolute bottom-2.5 left-3 text-slate-500">
            <Search className="h-3.5 w-3.5" />
          </span>
          <input
            type="text"
            placeholder="Search keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-850 bg-slate-900 py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-650 outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-2xl border glass-panel p-6 shadow-sm">
        {loading ? (
          <div className="py-24 text-center text-xs text-slate-500 font-semibold animate-pulse-subtle">
            Aggregating data report sheets...
          </div>
        ) : filtered.length > 0 ? (
          <div className="overflow-x-auto">
            {/* 1. SALES REPORT TABLE */}
            {reportTab === 'sales' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-550/10 text-slate-500 font-medium uppercase tracking-wider">
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Salesman</th>
                    <th className="py-3 px-3 text-right">MS Qty (L)</th>
                    <th className="py-3 px-3 text-right">HSD Qty (L)</th>
                    <th className="py-3 px-3 text-right">Total Value</th>
                    <th className="py-3 px-3 text-right">Cash</th>
                    <th className="py-3 px-3 text-right">UPI</th>
                    <th className="py-3 px-3 text-right">Credit</th>
                    <th className="py-3 px-3 text-right">POS</th>
                    <th className="py-3 px-3 text-right">Testing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-550/5">
                  {filtered.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-500/5">
                      <td className="py-3.5 px-3 font-mono">{new Date(row.createdAt).toLocaleDateString()}</td>
                      <td className="py-3.5 px-3 font-semibold">{row.salesmanName}</td>
                      <td className="py-3.5 px-3 text-right text-slate-300 font-mono">{row.ms.quantity.toFixed(1)}</td>
                      <td className="py-3.5 px-3 text-right text-slate-300 font-mono">{row.hsd.quantity.toFixed(1)}</td>
                      <td className="py-3.5 px-3 text-right font-bold text-slate-200">{formatRupee(row.finalTotalSale)}</td>
                      <td className="py-3.5 px-3 text-right text-slate-400 font-mono">{formatRupee(row.paymentBreakup.cashAmount)}</td>
                      <td className="py-3.5 px-3 text-right text-slate-400 font-mono">{formatRupee(row.paymentBreakup.upiAmount)}</td>
                      <td className="py-3.5 px-3 text-right text-slate-400 font-mono">{formatRupee(row.paymentBreakup.creditAmount)}</td>
                      <td className="py-3.5 px-3 text-right text-slate-400 font-mono">{formatRupee(row.paymentBreakup.posAmount)}</td>
                      <td className="py-3.5 px-3 text-right text-slate-400 font-mono">{formatRupee(row.testingTotalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 2. COUNTER CASH TABLE */}
            {reportTab === 'counter' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-550/10 text-slate-500 font-medium uppercase tracking-wider">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Entered By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-550/5">
                  {filtered.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-500/5">
                      <td className="py-3.5 px-4 font-mono">{new Date(row.createdAt).toLocaleString()}</td>
                      <td className="py-3.5 px-4">
                        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                          ['Fresh Cash Sale', 'Return Credit Cash'].includes(row.type)
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {row.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-200">{formatRupee(row.amount)}</td>
                      <td className="py-3.5 px-4 text-slate-400">{row.description}</td>
                      <td className="py-3.5 px-4 text-slate-400">{row.enteredBy?.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 3. CREDITS ISSUED TABLE */}
            {reportTab === 'credit' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-550/10 text-slate-500 font-medium uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Vehicle No.</th>
                    <th className="py-3 px-4 text-right">Issued Amount</th>
                    <th className="py-3 px-4 text-right">Remaining Balance</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Salesman</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-550/5">
                  {filtered.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-500/5">
                      <td className="py-3.5 px-4 font-mono">{new Date(row.date).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-200">{row.customerName}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">{row.vehicleNumber}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-400">{formatRupee(row.amount)}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-200">{formatRupee(row.remainingBalance)}</td>
                      <td className="py-3.5 px-4">
                        <span className="rounded-lg px-2 py-0.5 text-[9px] font-bold bg-slate-800 text-slate-400">
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">{row.salesmanName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 4. RECOVERY PAYMENTS TABLE */}
            {reportTab === 'recovery' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-550/10 text-slate-500 font-medium uppercase tracking-wider">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Vehicle No.</th>
                    <th className="py-3 px-4 text-right">Amount Paid</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4">Collected By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-550/5">
                  {filtered.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-500/5">
                      <td className="py-3.5 px-4 font-mono">{new Date(row.date).toLocaleString()}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-200">{row.creditLedgerId?.customerName}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">{row.creditLedgerId?.vehicleNumber}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-400">{formatRupee(row.amountPaid)}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-400">{row.paymentMode}</td>
                      <td className="py-3.5 px-4 text-slate-400">{row.receiver?.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 5. SALESMAN WISE TABLE */}
            {reportTab === 'salesman' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-550/10 text-slate-500 font-medium uppercase tracking-wider">
                    <th className="py-3 px-4">Salesman</th>
                    <th className="py-3 px-4 text-right">Total Fuel Sold</th>
                    <th className="py-3 px-4 text-right">Cash Received</th>
                    <th className="py-3 px-4 text-right">UPI Received</th>
                    <th className="py-3 px-4 text-right">POS Received</th>
                    <th className="py-3 px-4 text-right">Credit Given</th>
                    <th className="py-3 px-4 text-right">Credits Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-550/5">
                  {filtered.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-500/5">
                      <td className="py-3.5 px-4 font-semibold text-slate-200">{row.salesmanName}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-100">{formatRupee(row.totalSales)}</td>
                      <td className="py-3.5 px-4 text-right text-slate-400">{formatRupee(row.cash)}</td>
                      <td className="py-3.5 px-4 text-right text-slate-400">{formatRupee(row.upi)}</td>
                      <td className="py-3.5 px-4 text-right text-slate-400">{formatRupee(row.pos)}</td>
                      <td className="py-3.5 px-4 text-right text-rose-500 font-bold">{formatRupee(row.credit)}</td>
                      <td className="py-3.5 px-4 text-right text-slate-400">{row.creditsCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 6. SHIFT HISTORY TABLE */}
            {reportTab === 'shift' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-550/10 text-slate-500 font-medium uppercase tracking-wider">
                    <th className="py-3 px-4">Shift No.</th>
                    <th className="py-3 px-4">Start Time</th>
                    <th className="py-3 px-4">End Time</th>
                    <th className="py-3 px-4 text-right">Opening Cash</th>
                    <th className="py-3 px-4 text-right">Closing Declared</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Opened By</th>
                    <th className="py-3 px-4">Closed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-550/5">
                  {filtered.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-500/5">
                      <td className="py-3.5 px-4 font-semibold text-slate-200">Shift #{row.shiftNumber}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{new Date(row.startTime).toLocaleString()}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        {row.endTime ? new Date(row.endTime).toLocaleString() : 'Open (चल रहा है)'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-400">{formatRupee(row.startCash)}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-100">{formatRupee(row.endCash)}</td>
                      <td className="py-3.5 px-4">
                        <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                          row.status === 'Open' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">{row.openedBy?.name}</td>
                      <td className="py-3.5 px-4 text-slate-400">{row.closedBy?.name || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="py-24 text-center text-xs text-slate-500 border border-dashed border-slate-550/20 rounded-2xl">
            No records found for the selected date range
          </div>
        )}
      </div>

      {/* Summary Aggregate Cards at the bottom */}
      {summaryData && filtered.length > 0 && (
        <div className="rounded-2xl border border-orange-500/10 bg-orange-500/5 p-6 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 mb-4">
            Aggregated Summary / रिपोर्ट का संक्षेप
          </h3>
          
          {reportTab === 'sales' && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs text-slate-300">
              <div className="space-y-1.5">
                <p className="text-[10px] text-slate-500">TOTAL FUEL SOLD (VALUE)</p>
                <p className="text-lg font-bold text-slate-200">{formatRupee(summaryData.finalTotalSale)}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] text-slate-500">PETROL (MS) VOLUME</p>
                <p className="text-lg font-semibold text-slate-200">{summaryData.msQty.toFixed(1)} Liters</p>
                <p className="text-[10px] text-slate-500">Value: {formatRupee(summaryData.msSale)}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] text-slate-500">DIESEL (HSD) VOLUME</p>
                <p className="text-lg font-semibold text-slate-200">{summaryData.hsdQty.toFixed(1)} Liters</p>
                <p className="text-[10px] text-slate-500">Value: {formatRupee(summaryData.hsdSale)}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] text-slate-500">PAYMENT MODES SUM</p>
                <p className="leading-tight text-[10px] text-slate-400">
                  Cash: {formatRupee(summaryData.cashAmount)} <br />
                  UPI: {formatRupee(summaryData.upiAmount)} <br />
                  Credit: {formatRupee(summaryData.creditAmount)} <br />
                  POS: {formatRupee(summaryData.posAmount)}
                </p>
              </div>
            </div>
          )}

          {reportTab === 'counter' && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs text-slate-300">
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500">TOTAL CASH INFLOW</p>
                <p className="text-lg font-bold text-emerald-400">+{formatRupee(summaryData.netInflow)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500">TOTAL CASH OUTFLOW</p>
                <p className="text-lg font-bold text-rose-400">-{formatRupee(summaryData.netOutflow)}</p>
              </div>
              <div className="space-y-1 text-[10px] text-slate-400">
                <p className="text-[10px] text-slate-500">OUTFLOW BREAKDOWN</p>
                <p>
                  Expenses: {formatRupee(summaryData.expenses)} | 
                  Deposits: {formatRupee(summaryData.bankDeposits)} | 
                  Transfers: {formatRupee(summaryData.cashTransfers)}
                </p>
              </div>
            </div>
          )}

          {reportTab === 'credit' && (
            <div className="grid gap-4 sm:grid-cols-3 text-xs text-slate-300">
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500">CREDIT ISSUED VALUE</p>
                <p className="text-lg font-bold text-slate-200">{formatRupee(summaryData.totalAmountIssued)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500">CREDIT REPAID VALUE</p>
                <p className="text-lg font-bold text-emerald-400">{formatRupee(summaryData.totalPaid)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500">REMAINING UNPAID OUTSTANDING</p>
                <p className="text-xl font-extrabold text-rose-500">{formatRupee(summaryData.totalRemainingBalance)}</p>
              </div>
            </div>
          )}

          {reportTab === 'recovery' && (
            <div className="grid gap-4 sm:grid-cols-2 text-xs text-slate-300">
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500">TOTAL RECOVERY COLLECTED</p>
                <p className="text-xl font-extrabold text-emerald-400">{formatRupee(summaryData.totalRecovered)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500">MODE OF COLLECTION</p>
                <p className="text-[10px] text-slate-400">
                  Cash: {formatRupee(summaryData.cash)} | 
                  UPI: {formatRupee(summaryData.upi)} | 
                  POS: {formatRupee(summaryData.pos)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Reports;
