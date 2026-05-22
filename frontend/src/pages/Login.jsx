import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Fuel, Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await login(username, password);
      // AuthProvider redirects automatically or updates state causing app to render Dashboard
    } catch (err) {
      setError(err.message || 'Login failed. Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  const seedAccounts = [
    { role: 'Owner (मालिक)', user: 'owner', desc: 'Full access + Reopen closed shifts' },
    { role: 'Manager (मैनेजर)', user: 'manager', desc: 'Manage entries & close shifts' },
    { role: 'Salesman (सेल्समैन)', user: 'salesman', desc: 'Create sales entries (read-only after save)' },
    { role: 'Counter Op (ऑपरेटर)', user: 'counter', desc: 'Manage cash counter & payments' },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#090a0f] p-4 text-slate-200">
      {/* Background radial effects */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-orange-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-amber-600/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-xl shadow-orange-500/20">
            <Fuel className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
            FuelLedger
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Pump Accountability & Cash Audit System <br />
            <span className="text-xs text-slate-600">ईंधन पंप नकद और ऑडिट नियंत्रण प्रणाली</span>
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-800 bg-[#12141c] p-8 shadow-2xl shadow-black/60">
          <h2 className="text-xl font-semibold text-slate-100">Sign In (लॉग इन करें)</h2>
          <p className="mt-1 text-xs text-slate-500">Enter credentials to access your terminal</p>

          {error && (
            <div className="mt-4 flex items-start space-x-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-sm text-rose-400">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Username / यूजर आईडी
              </label>
              <div className="relative mt-2">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <User className="h-4.5 w-4.5" />
                </span>
                <input
                  type="text"
                  placeholder="e.g. owner, manager"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/50 py-3 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all focus:border-orange-500 focus:bg-slate-900/80"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Password / पासवर्ड
              </label>
              <div className="relative mt-2">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Lock className="h-4.5 w-4.5" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/50 py-3 pl-10 pr-10 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all focus:border-orange-500 focus:bg-slate-900/80"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Secure Log In / प्रवेश करें'}
            </button>
          </form>
        </div>

        {/* Demo Credentials Box */}
        <div className="mt-6 rounded-2xl border border-slate-800/60 bg-slate-950/40 p-5 backdrop-blur-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Demo Access Accounts / डेमो खाते
          </h3>
          <div className="mt-3 divide-y divide-slate-900">
            {seedAccounts.map((ac) => (
              <div key={ac.user} className="flex justify-between py-2 text-xs">
                <span className="font-semibold text-slate-300">{ac.role}</span>
                <div className="text-right">
                  <code className="rounded bg-slate-900 px-1.5 py-0.5 text-orange-400 font-mono">
                    {ac.user}
                  </code>
                  <span className="mx-1 text-slate-600">/</span>
                  <code className="text-slate-500 font-mono">password123</code>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-center text-slate-500">
            *All passwords are <code>password123</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
