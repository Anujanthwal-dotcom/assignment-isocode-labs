'use client';

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { StaffShell } from '@/components/staff/StaffShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { apiFetch } from '@/lib/api/client';
import {
  FileSpreadsheet,
  Boxes,
  Package,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  History,
  Store,
} from 'lucide-react';

interface ImportBatch {
  id: string;
  fileName: string;
  locationName: string;
  status: string;
  totalRows: number;
  appliedRows: number;
  rejectedRows: number;
  createdAt: string;
}

export default function StaffOverviewPage() {
  const { user } = useAuth();
  const [imports, setImports] = React.useState<ImportBatch[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [storeStockCount, setStoreStockCount] = React.useState<number | null>(null);

  const store = user?.store;
  const storeId = store?.id;

  React.useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Fetch recent CSV imports
        const importsRes = await apiFetch<{ data: ImportBatch[] }>(
          '/inventory/imports?limit=5',
        ).catch(() => ({ data: [] }));

        setImports(importsRes.data || []);

        // Fetch store inventory balances count if storeId is known
        if (storeId) {
          const balancesRes = await apiFetch<{ pagination?: { total?: number }; data?: any[] }>(
            `/inventory?storeId=${storeId}&limit=1`,
          ).catch(() => ({ pagination: undefined, data: [] }));
          setStoreStockCount(balancesRes.pagination?.total ?? balancesRes.data?.length ?? null);
        }
      } catch (err) {
        console.error('Failed to load store dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [storeId]);

  return (
    <StaffShell pageContext="Store Operations Dashboard">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Welcome & Store Identity Banner */}
        <div className="bg-gradient-to-r from-[#0D5C5A] via-[#094745] to-[#063332] rounded-2xl p-6 text-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20 text-white text-[11px] font-semibold backdrop-blur-xs">
              <Store className="w-3.5 h-3.5" />
              <span>Assigned Store Hub</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {store?.name || 'Retail Pharmacy Store'}
            </h1>
            <p className="text-teal-100 text-xs">
              Store Code: <span className="font-mono font-bold text-white">{store?.code || 'STORE'}</span> &bull;
              Staff on duty: <span className="font-semibold text-white">{user?.profile?.fullName || 'Staff Member'}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/staff/inventory/import"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#0D5C5A] font-bold text-xs hover:bg-[#F0FDFA] shadow-xs transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#0D5C5A]" />
              <span>Inject Today&apos;s CSV</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Daily CSV Injection */}
          <Card className="border-[#EBECEF] bg-white hover:border-[#0D5C5A] hover:bg-[#F0FDFA]/30 hover:shadow-xs transition-all">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-xl bg-[#F0FDFA] border border-[#99F6E4] flex items-center justify-center text-[#0D5C5A] mb-2">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <CardTitle className="text-base font-bold text-[#0F172A]">
                Daily CSV Inventory Injection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link
                href="/staff/inventory/import"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0D5C5A] hover:underline"
              >
                Upload Daily CSV &rarr;
              </Link>
            </CardContent>
          </Card>

          {/* Card 2: Live Store Inventory */}
          <Card className="border-[#EBECEF] bg-white hover:border-[#0D5C5A] hover:bg-[#F0FDFA]/30 hover:shadow-xs transition-all">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-xl bg-[#F0FDFA] border border-[#99F6E4] flex items-center justify-center text-[#0D5C5A] mb-2">
                <Boxes className="w-5 h-5" />
              </div>
              <CardTitle className="text-base font-bold text-[#0F172A]">
                Live Store Balances
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-[#78879A] font-mono">
                  {storeStockCount !== null ? `${storeStockCount} SKUs Tracked` : 'Live Tracking'}
                </span>
                <Link
                  href="/staff/inventory"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0D5C5A] hover:underline"
                >
                  View Balances &rarr;
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Order Fulfilment */}
          <Card className="border-[#EBECEF] bg-white hover:border-[#0D5C5A] hover:bg-[#F0FDFA]/30 hover:shadow-xs transition-all">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-xl bg-[#F0FDFA] border border-[#99F6E4] flex items-center justify-center text-[#0D5C5A] mb-2">
                <Package className="w-5 h-5" />
              </div>
              <CardTitle className="text-base font-bold text-[#0F172A]">
                Store Order Fulfilment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link
                href="/staff/fulfilment"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0D5C5A] hover:underline"
              >
                Go to Fulfilment &rarr;
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Recent Daily CSV Ingestions Table */}
        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#0D5C5A]" />
              <CardTitle className="text-sm font-bold text-[#0F172A]">
                Recent Daily CSV Ingestions
              </CardTitle>
            </div>
            <Link
              href="/staff/inventory/import"
              className="text-xs font-semibold text-[#0D5C5A] hover:underline"
            >
              + New CSV Injection
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading import history...</div>
            ) : imports.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">No CSV batches uploaded today yet.</p>
                <Link
                  href="/staff/inventory/import"
                  className="inline-block text-xs font-bold text-[#0D5C5A] hover:underline"
                >
                  Upload your store&apos;s first daily CSV &rarr;
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                      <th className="py-2.5 px-4">File Name</th>
                      <th className="py-2.5 px-4">Target Hub</th>
                      <th className="py-2.5 px-4">Processed Rows</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Uploaded At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {imports.map((item) => (
                      <tr key={item.id} className="hover:bg-[#F0FDFA]/40 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-medium text-slate-800">
                          {item.fileName}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">{item.locationName}</td>
                        <td className="py-2.5 px-4 text-slate-700 font-semibold">
                          {item.appliedRows} / {item.totalRows} applied
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.status === 'FAILED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-[#F0FDFA] text-[#0D5C5A] border border-[#99F6E4]'
                          }`}>
                            {item.status === 'COMPLETED' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                            {item.status === 'FAILED' && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                            <span>{item.status}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-400">
                          {new Date(item.createdAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StaffShell>
  );
}
