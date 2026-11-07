'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';

export default function HomePage() {
  const router = useRouter();
  const { requestCustomerOtp, verifyCustomerOtp, loginStaff } = useAuth();

  const [activeLogin, setActiveLogin] = useState<'CUSTOMER' | 'PHARMACIST' | 'ADMIN' | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  // 1-Click Tester Login Handlers
  const handleCustomerLogin = async () => {
    setActiveLogin('CUSTOMER');
    setLoginError(null);
    try {
      const res = await requestCustomerOtp('9876543210');
      const otp = res.developmentOtp || '123456';
      await verifyCustomerOtp('9876543210', otp);
      router.push('/customer');
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Customer login failed.');
      setActiveLogin(null);
    }
  };

  const handlePharmacistLogin = async () => {
    setActiveLogin('PHARMACIST');
    setLoginError(null);
    try {
      await loginStaff('pharmacist@example.com', 'DemoPassword123!');
      router.push('/pharmacist');
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Pharmacist login failed.');
      setActiveLogin(null);
    }
  };

  const handleAdminLogin = async () => {
    setActiveLogin('ADMIN');
    setLoginError(null);
    try {
      await loginStaff('admin@example.com', 'DemoPassword123!');
      router.push('/admin');
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Admin login failed.');
      setActiveLogin(null);
    }
  };

  return (
    <main className="min-h-screen flex flex-col lg:flex-row bg-slate-900 text-slate-100 font-sans">
      {/* =========================================================================
          LEFT 60% COLUMN: Kolkata Pharmacy Visual with Vertically Centered Tag Line
          ========================================================================= */}
      <section className="relative lg:w-[60%] flex flex-col justify-center p-8 sm:p-12 lg:p-16 overflow-hidden min-h-[380px] lg:min-h-screen">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center z-0 scale-100 transition-transform duration-1000 ease-out"
          style={{ backgroundImage: "url('/images/kolkata-pharmacy.jpg')" }}
        />
        {/* Balanced Ambient Gradient for Center Tagline Readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/60 to-slate-950/30 z-0" />

        {/* Main Tag Line (Vertically Centered) */}
        <div className="relative z-10 max-w-xl space-y-3">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight drop-shadow-md">
            Clinical Precision. Instant Dispensing. Zero Non-Compliance.
          </h2>
          <p className="text-base sm:text-lg text-slate-300 font-normal drop-shadow-sm">
            Enterprise Pharmacy &amp; Multi-Store Management System
          </p>
        </div>
      </section>

      {/* =========================================================================
          RIGHT 40% COLUMN: Clean White Auth Column & Direct Clickable Role Cards
          ========================================================================= */}
      <section className="lg:w-[40%] bg-white text-slate-900 flex flex-col justify-center p-6 sm:p-10 lg:p-14 border-l border-slate-200 min-h-screen">
        <div className="w-full max-w-md mx-auto space-y-6">
          <div className="pb-5 border-b border-slate-100">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Pharmacy Platform</h1>
            <p className="text-xs text-slate-500 mt-0.5">Select a portal below to sign in</p>
          </div>

          {/* Login Error Notification */}
          {loginError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              <span>{loginError}</span>
            </div>
          )}

          {/* Direct Clickable Role Cards */}
          <div className="space-y-3">
            {/* 1. Customer Card */}
            <button
              onClick={handleCustomerLogin}
              disabled={activeLogin !== null}
              className="w-full text-left group p-4 rounded-xl border border-slate-200 bg-white hover:border-purple-400 hover:bg-purple-50/30 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:opacity-60 transition-all flex items-center justify-between gap-4 cursor-pointer"
            >
              <span className="text-base font-semibold text-slate-900 group-hover:text-purple-700 transition-colors">
                Customer
              </span>
              <span className="shrink-0 text-slate-400 group-hover:text-purple-700 font-medium text-xs transition-colors">
                {activeLogin === 'CUSTOMER' ? 'Signing in...' : 'Enter →'}
              </span>
            </button>

            {/* 2. Pharmacist Card */}
            <button
              onClick={handlePharmacistLogin}
              disabled={activeLogin !== null}
              className="w-full text-left group p-4 rounded-xl border border-slate-200 bg-white hover:border-teal-400 hover:bg-teal-50/30 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:opacity-60 transition-all flex items-center justify-between gap-4 cursor-pointer"
            >
              <span className="text-base font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">
                Pharmacist
              </span>
              <span className="shrink-0 text-slate-400 group-hover:text-teal-700 font-medium text-xs transition-colors">
                {activeLogin === 'PHARMACIST' ? 'Signing in...' : 'Enter →'}
              </span>
            </button>

            {/* 3. Admin Card */}
            <button
              onClick={handleAdminLogin}
              disabled={activeLogin !== null}
              className="w-full text-left group p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/30 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 transition-all flex items-center justify-between gap-4 cursor-pointer"
            >
              <span className="text-base font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
                Admin
              </span>
              <span className="shrink-0 text-slate-400 group-hover:text-indigo-700 font-medium text-xs transition-colors">
                {activeLogin === 'ADMIN' ? 'Signing in...' : 'Enter →'}
              </span>
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
