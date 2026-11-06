'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';
import { FileText, Printer, ArrowLeft, Store, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function CustomerOrderInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [invoice, setInvoice] = React.useState<any>(null);

  const fetchInvoice = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<any>(`/customer/orders/${orderId}/invoice`);
      setInvoice(res);
    } catch (err: any) {
      setError(err?.message || 'Invoice for this order has not been generated yet.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  React.useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#EAE8F0] print:hidden">
        <div className="flex items-center gap-2">
          <Link
            href={`/customer/orders/${orderId}`}
            className="p-1 rounded-lg text-[#78879A] hover:bg-[#F8F9FB] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-xl font-bold text-[#14161A] tracking-tight">Order Invoice</h1>
        </div>

        {invoice && (
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#6240E8] text-white hover:bg-[#5232d4] shadow-xs flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Invoice</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-[#78879A]">Loading invoice...</div>
      ) : error ? (
        <div className="p-8 text-center text-xs text-rose-600 bg-rose-50 rounded-2xl border border-rose-200">
          <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-rose-500" />
          {error}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#EAE8F0] p-8 shadow-xs space-y-6 text-xs text-[#14161A] print:border-none print:shadow-none print:p-0">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#EAE8F0] pb-6">
            <div>
              <div className="flex items-center gap-2">
                <Store className="w-6 h-6 text-[#6240E8]" />
                <span className="text-lg font-bold text-[#351F65] tracking-tight">
                  {invoice.storeName}
                </span>
              </div>
              <p className="text-[#78879A] text-[11px] mt-1 max-w-xs">
                {invoice.storeAddress}, {invoice.storeCity}
              </p>
              <span className="text-[10px] font-mono text-[#78879A] block mt-0.5">
                Store Code: {invoice.storeCode}
              </span>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs font-bold uppercase tracking-wider text-[#78879A] block">
                Pharmacy Tax Invoice
              </span>
              <span className="text-base font-extrabold font-mono text-[#6240E8] block">
                {invoice.invoiceNumber}
              </span>
              <span className="text-[11px] text-[#78879A] block mt-1">
                Order #: <strong>{invoice.orderNumber}</strong>
              </span>
              <span className="text-[11px] text-[#78879A] block">
                Issued:{' '}
                {new Date(invoice.issuedAt).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-b border-[#EAE8F0] pb-4">
            <div>
              <span className="text-[10px] font-bold text-[#78879A] uppercase tracking-wider block mb-1">
                Billed To
              </span>
              <strong className="text-sm block">{invoice.customerName}</strong>
              {invoice.customerPhone && (
                <span className="text-[11px] text-[#78879A] block">
                  +91 {invoice.customerPhone}
                </span>
              )}
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-[#78879A] uppercase tracking-wider block mb-1">
                Payment Status
              </span>
              <strong className="text-xs block text-[#14161A]">{invoice.paymentMethod}</strong>
              <span
                className={`text-[10px] font-bold uppercase ${
                  invoice.paymentStatus === 'SUCCESS' ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {invoice.paymentStatus}
              </span>
            </div>
          </div>

          <div>
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FB] border-b border-[#EAE8F0] text-[#78879A] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Medicine Description</th>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                  <th className="py-2.5 px-3 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE8F0]">
                {invoice.items?.map((item: any) => (
                  <tr key={item.id}>
                    <td className="py-3 px-3">
                      <span className="font-bold text-[#14161A] block">{item.medicineName}</span>
                      <span className="text-[10px] text-[#78879A]">
                        {item.strength} &bull; {item.dosageForm}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-[#78879A]">{item.sku}</td>
                    <td className="py-3 px-3 text-right">₹{item.unitPrice.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right font-bold">{item.quantity}</td>
                    <td className="py-3 px-3 text-right font-bold text-[#351F65]">
                      ₹{item.lineTotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2">
            <div className="w-64 space-y-2 text-xs">
              <div className="flex justify-between text-[#78879A]">
                <span>Subtotal:</span>
                <span className="font-semibold text-[#14161A]">₹{invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#78879A]">
                <span>Delivery Fee:</span>
                <span className="font-semibold text-[#14161A]">
                  ₹{invoice.deliveryFee.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#EAE8F0] pt-2 font-bold text-sm text-[#351F65]">
                <span>Total Amount:</span>
                <span className="text-base text-[#6240E8]">₹{invoice.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
