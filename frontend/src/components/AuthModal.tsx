"use client";

import React, { useState } from 'react';
import { X, Mail, User as UserIcon, ArrowRight, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';
import { loginUser, UserProfile } from '@/services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: UserProfile) => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter a valid email address');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const user = await loginUser(email.trim(), name.trim() || undefined);
      if (onSuccess) onSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const user = await loginUser('demo@groww.in', 'Demo User');
      if (onSuccess) onSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#44475b]/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white rounded-2xl p-8 max-w-[440px] w-full shadow-2xl relative border border-gray-100 transform transition-all animate-scaleUp"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-gray-400 hover:text-[#44475b] hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center text-center gap-2 mb-6">
          <div className="w-12 h-12 bg-[#e6f9f4] rounded-full flex items-center justify-center text-[#00d09c] mb-1">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-[#44475b] tracking-tight">
            {mode === 'LOGIN' ? 'Welcome Back to Groww' : 'Create Groww Account'}
          </h2>
          <p className="text-xs text-[#7c7e8c] max-w-xs">
            Personalize your smart watchlist, track goal impacts & receive live anomaly insights.
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => { setMode('LOGIN'); setError(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'LOGIN' ? 'bg-white text-[#44475b] shadow-sm' : 'text-[#7c7e8c] hover:text-[#44475b]'}`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => { setMode('SIGNUP'); setError(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'SIGNUP' ? 'bg-white text-[#44475b] shadow-sm' : 'text-[#7c7e8c] hover:text-[#44475b]'}`}
          >
            Sign Up
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 text-[#eb5b3c] text-xs font-medium rounded-lg text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'SIGNUP' && (
            <div>
              <label className="block text-[11px] font-bold text-[#7c7e8c] uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus-within:border-[#00d09c] focus-within:bg-white transition-all">
                <UserIcon className="w-4 h-4 text-gray-400 mr-2.5 shrink-0" />
                <input
                  type="text"
                  placeholder="e.g. Ayushi Raj"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm text-[#44475b] w-full"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-[#7c7e8c] uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus-within:border-[#00d09c] focus-within:bg-white transition-all">
              <Mail className="w-4 h-4 text-gray-400 mr-2.5 shrink-0" />
              <input
                type="email"
                placeholder="e.g. ayushi@groww.in"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-[#44475b] w-full"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full mt-2 py-3 bg-[#00d09c] hover:bg-[#00b386] text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-[#00d09c]/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Authenticating…' : (
              <>
                {mode === 'LOGIN' ? 'Continue with Email' : 'Create Account'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-[11px] font-semibold text-[#7c7e8c] uppercase">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Quick Demo Login Button */}
        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={loading}
          className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-[#44475b] font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-[#00d09c]" />
          Quick Demo Login (Judge Test Account)
        </button>

        {/* Footer Note */}
        <div className="mt-5 text-center text-[11px] text-[#7c7e8c]">
          By continuing, you agree to Groww's Terms of Service & Privacy Policy.
        </div>
      </div>
    </div>
  );
}
