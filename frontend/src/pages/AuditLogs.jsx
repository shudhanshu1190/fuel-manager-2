import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import {
  History,
  Search,
  Calendar,
  X,
  AlertCircle,
  Eye,
  ArrowRight,
} from 'lucide-react';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal inspection state
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    loadAuditLogs();
  }, [search, entityFilter, startDate, endDate]);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const qParams = [];
      if (search) qParams.push(`search=${encodeURIComponent(search)}`);
      if (entityFilter) qParams.push(`entityName=${entityFilter}`);
      if (startDate) qParams.push(`startDate=${startDate}`);
      if (endDate) qParams.push(`endDate=${endDate}`);
      
      const queryStr = qParams.length > 0 ? `?${qParams.join('&')}` : '';
      const data = await api.get(`/audit${queryStr}`);
      setLogs(data);
    } catch (err) {
      console.error('Error loading audit logs:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to render object changes cleanly
  const renderObjectDiff = (oldVal, newVal) => {
    if (!oldVal || !newVal) return <p className="text-slate-500 font-semibold italic text-xs">No modification diff available.</p>;

    // We compile the keys that have different values
    const diffs = [];
    const keys = new Set([...Object.keys(oldVal), ...Object.keys(newVal)]);

    // Helper to recursively find changes
    const findChanges = (prefix, oldObj, newObj) => {
      if (!oldObj || !newObj) return;
      Object.keys(newObj).forEach((k) => {
        const fullKey = prefix ? `${prefix}.${k}` : k;
        const ov = oldObj[k];
        const nv = newObj[k];

        if (typeof nv === 'object' && nv !== null && !Array.isArray(nv)) {
          findChanges(fullKey, ov || {}, nv);
        } else if (JSON.stringify(ov) !== JSON.stringify(nv)) {
          // Skip internal mongo fields like _id, updatedAt, etc.
          if (['_id', 'updatedAt', 'createdAt', '__v', 'createdBy', 'updatedBy', 'shiftId'].includes(k)) return;
          diffs.push({
            field: fullKey,
            old: ov !== undefined ? JSON.stringify(ov) : '(undefined)',
            new: nv !== undefined ? JSON.stringify(nv) : '(undefined)',
          });
        }
      });
    };

    findChanges('', oldVal, newVal);

    if (diffs.length === 0) {
      return <p className="text-slate-500 italic text-xs">No notable changes detected (internal fields only).</p>;
    }

    return (
      <div className="space-y-2 max-h-72 overflow-y-auto">
        <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 pb-1.5">
          <span className="col-span-4">Field Name</span>
          <span className="col-span-4">Original Value</span>
          <span className="col-span-4">New Value</span>
        </div>
        {diffs.map((d, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 text-xs py-1 border-b border-slate-500/5 items-center">
            <span className="col-span-4 font-semibold text-slate-400 font-mono truncate">{d.field}</span>
            <span className="col-span-4 rounded bg-rose-500/10 border border-rose-500/10 px-1.5 py-0.5 text-rose-400 font-mono line-through truncate max-h-8 overflow-hidden block">
              {d.old}
            </span>
            <span className="col-span-4 rounded bg-emerald-500/10 border border-emerald-500/10 px-1.5 py-0.5 text-emerald-400 font-mono truncate max-h-8 overflow-hidden block">
              {d.new}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Audit trail</h1>
        <p className="text-xs text-slate-500">
          Strict tamper ledger logging shift edits, overrides and cash balance history / पंप गतिविधियों के ऑडिट लॉग्स
        </p>
      </div>

      {/* Filter Row */}
      <div className="rounded-2xl border glass-panel p-5 shadow-sm grid gap-4 sm:grid-cols-12 items-center">
        {/* Search */}
        <div className="sm:col-span-4 relative">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Search Logs</label>
          <span className="absolute bottom-2.5 left-3 text-slate-500">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search by Username or Remarks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-850 bg-slate-900 py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-650 outline-none focus:border-orange-500"
          />
        </div>

        {/* Entity Type */}
        <div className="sm:col-span-3">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Module / वर्ग</label>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-850 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none"
          >
            <option value="">All Modules</option>
            <option value="Sale">Fuel Sales (बिक्री)</option>
            <option value="Shift">Shift Cycles (शिफ्ट)</option>
            <option value="CreditLedger">Credits Issued (उधार)</option>
            <option value="CounterTransaction">Counter Cash (नकदी)</option>
          </select>
        </div>

        {/* Start Date */}
        <div className="sm:col-span-2.5">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-slate-850 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none"
          />
        </div>

        {/* End Date */}
        <div className="sm:col-span-2.5">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg border border-slate-850 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none"
          />
        </div>
      </div>

      {/* Audit Table */}
      <div className="rounded-2xl border glass-panel p-6 shadow-sm">
        {loading ? (
          <div className="py-24 text-center text-xs text-slate-500 font-semibold animate-pulse-subtle">
            Reading security logs...
          </div>
        ) : logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-550/10 text-slate-500 font-medium uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Module</th>
                  <th className="py-3 px-4">Remarks / Summary</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-550/5">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-500/5">
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-200">@{log.username}</td>
                    <td className="py-3.5 px-4 font-semibold text-orange-400">{log.action}</td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono">{log.entityName}</td>
                    <td className="py-3.5 px-4 text-slate-400 max-w-sm truncate">{log.remarks}</td>
                    <td className="py-3.5 px-4 text-right">
                      {log.oldValue && log.newValue ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="rounded-lg bg-orange-600/10 px-3 py-1.5 text-[10px] font-bold text-orange-400 hover:bg-orange-650 hover:text-white transition-colors flex items-center space-x-1 ml-auto"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Inspect Changes</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-600 italic px-3 select-none">No Mod Diff</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-24 text-center text-xs text-slate-500 border border-dashed border-slate-550/20 rounded-2xl">
            No audit activities logged matching filters
          </div>
        )}
      </div>

      {/* INSPECT MODIFICATION MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-[#12141c] p-6 text-slate-200 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-850">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Inspect Modified Object Fields
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Audit log ID: {selectedLog._id}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* General details */}
            <div className="mt-4 grid gap-3 grid-cols-3 bg-slate-900 border border-slate-850 p-4 rounded-xl text-xs">
              <div>
                <span className="text-slate-500 block">Operator:</span>
                <span className="font-bold text-slate-300">@{selectedLog.username}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Action & Module:</span>
                <span className="font-semibold text-slate-300">
                  {selectedLog.action} ({selectedLog.entityName})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Timestamp:</span>
                <span className="font-mono text-slate-400">{new Date(selectedLog.timestamp).toLocaleString()}</span>
              </div>
              <div className="col-span-3 border-t border-slate-800 pt-2 text-[10px] text-slate-400 italic">
                <strong>Log Summary:</strong> {selectedLog.remarks}
              </div>
            </div>

            {/* Object Diff Box */}
            <div className="mt-5 border border-slate-800 bg-slate-950/50 p-5 rounded-xl">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Field Level Comparison:</h4>
              {renderObjectDiff(selectedLog.oldValue, selectedLog.newValue)}
            </div>

            <div className="flex justify-end pt-5 border-t border-slate-850 mt-5">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-750"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
