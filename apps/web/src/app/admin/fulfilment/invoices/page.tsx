'use client';

import * as React from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';
import { BackButton } from '@/components/shared/BackButton';

export default function AdminInvoicesListPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [invoices, setInvoices] = React.useState<any[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');

  const fetchInvoices = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<any>('/admin/fulfilment/invoices?limit=50');
      setInvoices(res.data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const filtered = invoices.filter((i) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      i.invoiceNumber?.toLowerCase().includes(q) ||
      i.orderNumber?.toLowerCase().includes(q) ||
      i.storeName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 py-2">
      <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div>
          <div className="flex flex-col items-start gap-3">
            <BackButton href="/admin/fulfilment" label="Fulfilment Overview" />
            <h1 className="font-display text-2xl font-bold tracking-tight text-[#0F172A] sm:text-[28px] sm:leading-[36px]">
              Platform Pharmacy Invoices
            </h1>
          </div>
        </div>

        <div className="relative max-w-xs w-full">
          <input
            type="text"
            placeholder="Search invoice #, order #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-[#EBECEF] rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0D5C5A]/20 focus:border-[#0D5C5A]"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#EBECEF] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#78879A]">Loading invoices...</div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-600 bg-rose-50/50">
            <div className="font-bold mb-1">[!] Error</div>
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#78879A]">No invoices issued yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FB] border-b border-[#EBECEF] text-[#78879A] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Order #</th>
                  <th className="py-3.5 px-4">Fulfillment Store</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4">Issued At</th>
                  <th className="py-3.5 px-4 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBECEF] text-[#14161A]">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F8F9FB]/50">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#0D5C5A]">
                      {row.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold">{row.orderNumber}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold block">{row.storeName}</span>
                      <span className="text-[10px] text-[#78879A] font-mono">{row.storeCode}</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-sm text-[#0F172A]">
                      ₹{row.total.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold block">{row.paymentMethod}</span>
                      <span
                        className={`text-[10px] font-bold ${
                          row.paymentStatus === 'SUCCESS' ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {row.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-[#78879A] font-mono">
                      {new Date(row.issuedAt).toLocaleString('en-IN', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/admin/fulfilment/invoices/${row.orderId}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-[#14161A]"
                      >
                        <span>View &rarr;</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
