import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useSettings } from '../contexts/SettingsContext.tsx';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
   const { login } = useAuth();
  const { getSetting } = useSettings();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo area */}
        <div className="text-center mb-12">
          <h1 className="text-2xl font-bold tracking-tighter text-red-700 uppercase mb-2">
            {getSetting('company.name') || 'TEAM MANAGEMENT'}
          </h1>
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">
            Corporate Management Platform
          </p>
        </div>

        {/* Login card */}
        <div className="bg-surface-container-lowest editorial-shadow rounded-xl p-10">
          <div className="mb-8">
            <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] block mb-2">
              Authentication
            </span>
            <h2 className="text-3xl font-black text-on-surface tracking-tighter">
              Welcome Back
            </h2>
            <p className="text-stone-500 mt-2 text-sm">
              Sign in to access your corporate intelligence dashboard.
            </p>
          </div>

          {error && (
            <div className="bg-error-container text-error px-4 py-3 rounded-lg mb-6 text-sm font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] block mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-on-surface text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-stone-400"
                placeholder="admin@team.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] block mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-on-surface text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-stone-400"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full primary-gradient text-white py-3.5 px-6 rounded-lg font-bold text-sm uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                  Authenticating...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-10 pt-6 border-t border-stone-100">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] mb-3">
              Demo Credentials
            </p>
            <div className="space-y-2">
              {[
                { label: 'Admin', email: 'admin@team.com', pass: 'admin123' },
                { label: 'Manager', email: 'manager@team.com', pass: 'manager123' },
                { label: 'Employee', email: 'employee@team.com', pass: 'employee123' },
              ].map((demo) => (
                <button
                  key={demo.label}
                  onClick={() => { setEmail(demo.email); setPassword(demo.pass); }}
                  className="w-full text-left px-4 py-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container-high transition-all group flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-on-surface">{demo.label}</span>
                    <span className="text-xs text-stone-400 ml-2">{demo.email}</span>
                  </div>
                  <span className="material-symbols-outlined text-stone-400 group-hover:text-primary text-sm transition-colors">arrow_forward</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">
            Secured Platform · 2026
          </p>
        </div>
      </div>
    </div>
  );
}
