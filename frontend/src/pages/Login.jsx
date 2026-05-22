import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Fuel, Lock, User, AlertCircle, Eye, EyeOff, Settings } from 'lucide-react';

const Login = () => {
  const { login, loginWithGoogle } = useAuth();
  
  // Local storage / env setup
  const [googleClientId, setGoogleClientId] = useState(
    localStorage.getItem('VITE_GOOGLE_CLIENT_ID') || import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
  );
  const [apiUrl, setApiUrl] = useState(
    localStorage.getItem('VITE_API_URL') || import.meta.env.VITE_API_URL || 'http://localhost:5000'
  );

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [usePasswordLogin, setUsePasswordLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle Google Token Callback
  const handleGoogleLogin = async (response) => {
    setLoading(true);
    setError('');
    try {
      await loginWithGoogle(response.credential);
    } catch (err) {
      setError(err.message || 'Google Sign-in failed. Please ensure your email is authorized.');
    } finally {
      setLoading(false);
    }
  };

  // Initialize GSI standard button
  useEffect(() => {
    if (!googleClientId || usePasswordLogin) return;

    const initializeGoogleSignIn = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleLogin,
        });
        
        const container = document.getElementById('google-signin-btn');
        if (container) {
          window.google.accounts.id.renderButton(container, {
            theme: 'filled_blue',
            size: 'large',
            width: '100%',
            shape: 'rectangular',
            text: 'signin_with',
          });
        }
      }
    };

    if (window.google) {
      initializeGoogleSignIn();
    } else {
      const timer = setInterval(() => {
        if (window.google) {
          initializeGoogleSignIn();
          clearInterval(timer);
        }
      }, 500);
      return () => clearInterval(timer);
    }
  }, [googleClientId, usePasswordLogin]);

  // Handle password fallback submit
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
    } catch (err) {
      setError(err.message || 'Login failed. Only Owner accounts are authorized.');
    } finally {
      setLoading(false);
    }
  };

  // Save Settings Modal parameters
  const handleSaveSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('VITE_API_URL', apiUrl);
    localStorage.setItem('VITE_GOOGLE_CLIENT_ID', googleClientId);
    setShowSettings(false);
    window.location.reload();
  };

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
        <div className="rounded-2xl border border-slate-800 bg-[#12141c] p-8 shadow-2xl shadow-black/60 relative">
          {/* Settings button in the corner */}
          <button
            onClick={() => setShowSettings(true)}
            className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-500 hover:bg-slate-800/50 hover:text-slate-300 transition-all"
            title="Configure connection settings"
          >
            <Settings className="h-5 w-5" />
          </button>

          <h2 className="text-xl font-semibold text-slate-100">Sign In (लॉग इन करें)</h2>
          <p className="mt-1 text-xs text-slate-500">Access your FuelLedger Owner Console</p>

          {error && (
            <div className="mt-4 flex items-start space-x-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-sm text-rose-400">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!googleClientId && !usePasswordLogin && (
            <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-400 flex flex-col space-y-2">
              <span className="font-semibold text-xs">Google Client ID is not configured.</span>
              <span className="text-[11px] text-amber-500/80">
                Please click the Settings gear icon in the top right to configure your Google Client ID and API URL.
              </span>
            </div>
          )}

          {!usePasswordLogin ? (
            <div className="mt-6 space-y-6">
              {googleClientId && (
                <div className="flex flex-col items-center justify-center p-5 border border-slate-800/80 bg-slate-900/20 rounded-xl">
                  <span className="text-xs text-slate-400 mb-4">Authenticate securely via Google</span>
                  <div id="google-signin-btn" className="w-full min-h-[44px] flex justify-center"></div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setUsePasswordLogin(true)}
                className="w-full text-center text-xs text-orange-500 hover:text-orange-400 transition-colors font-medium mt-4 block"
              >
                Or sign in with password (Owner fallback)
              </button>
            </div>
          ) : (
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
                    placeholder="e.g. owner"
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

              <button
                type="button"
                onClick={() => setUsePasswordLogin(false)}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-400 transition-colors font-medium mt-4 block"
              >
                Go back to Google Sign-In
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#12141c] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
              <Settings className="h-5 w-5 text-orange-500" />
              <span>System Connection Settings</span>
            </h3>
            <p className="mt-1 text-xs text-slate-400">Configure parameters for local storage override.</p>
            
            <form onSubmit={handleSaveSettings} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Backend API URL
                </label>
                <input
                  type="url"
                  required
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-900/50 py-3 px-4 text-sm text-slate-100 outline-none focus:border-orange-500"
                  placeholder="e.g. http://localhost:5000"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Google Client ID
                </label>
                <textarea
                  rows="3"
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-900/50 py-3 px-4 text-sm text-slate-100 outline-none focus:border-orange-500 font-mono text-xs"
                  placeholder="YOUR_CLIENT_ID.apps.googleusercontent.com"
                />
              </div>
              
              <div className="mt-6 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="flex-1 rounded-xl border border-slate-800 bg-slate-900/20 py-3 text-sm font-semibold text-slate-400 hover:bg-slate-900/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-3 text-sm font-semibold text-white hover:brightness-110"
                >
                  Save & Reload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
