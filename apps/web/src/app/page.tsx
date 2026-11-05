import Link from 'next/link';
import { HealthStatusCard } from '@/components/HealthStatusCard';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col justify-between p-6 sm:p-12 lg:p-16 max-w-6xl mx-auto">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-8 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pharmacy Platform</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Enterprise Pharmacy &amp; Multi-Store Management System
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          <span>Status: Development Environment (Phase 0)</span>
        </div>
      </header>

      {/* Main Body */}
      <section className="py-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Column: Platform Overview */}
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-800">
              Scaffolding &amp; Infrastructure
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              This environment serves as the core foundation for a production-oriented pharmacy
              management platform with strict regulatory compliance, multi-store inventory
              coordination, and intelligent prescription processing.
            </p>
          </div>

          {/* Portals & Authentication */}
          <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-3 shadow-xs">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Portals &amp; Role-Based Access
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <Link
                href="/customer"
                className="p-3 bg-slate-50 hover:bg-purple-50 hover:border-purple-200 rounded-lg border border-slate-100 transition-colors block"
              >
                <span className="font-semibold text-slate-800 block">Customer Portal &rarr;</span>
                <span className="text-slate-500">Mock OTP Login &bull; Role: CUSTOMER</span>
              </Link>
              <Link
                href="/pharmacist"
                className="p-3 bg-slate-50 hover:bg-teal-50 hover:border-teal-200 rounded-lg border border-slate-100 transition-colors block"
              >
                <span className="font-semibold text-slate-800 block">Pharmacist Portal &rarr;</span>
                <span className="text-slate-500">Email &amp; Password &bull; Role: PHARMACIST</span>
              </Link>
              <Link
                href="/admin"
                className="p-3 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 rounded-lg border border-slate-100 transition-colors block"
              >
                <span className="font-semibold text-slate-800 block">Admin Operations &rarr;</span>
                <span className="text-slate-500">Operations &amp; Compliance Portal</span>
              </Link>
              <Link
                href="/design-system"
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-100 transition-colors block"
              >
                <span className="font-semibold text-slate-800 block">Design System &rarr;</span>
                <span className="text-slate-500">Phase 0.5 Teladoc UI Showcase</span>
              </Link>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap gap-3 text-xs">
            <a
              href="http://localhost:3001/api/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
            >
              <span>Swagger API Docs</span>
              <span>&rarr;</span>
            </a>
            <a
              href="http://localhost:8025"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
            >
              <span>Mailpit Mailbox</span>
              <span>&rarr;</span>
            </a>
            <a
              href="http://localhost:9001"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
            >
              <span>MinIO Console</span>
              <span>&rarr;</span>
            </a>
          </div>
        </div>

        {/* Right Column: Health Status Card */}
        <div className="flex flex-col items-center lg:items-end w-full">
          <HealthStatusCard />
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-8 border-t border-slate-200 text-center text-xs text-slate-400">
        Pharmacy Platform &bull; Monorepo Powered by pnpm, Next.js, NestJS, Prisma &amp; Docker
        Compose
      </footer>
    </main>
  );
}
