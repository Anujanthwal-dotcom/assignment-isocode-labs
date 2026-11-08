'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';
import { BackButton } from '@/components/shared/BackButton';

export default function CustomerOrderInvoicePage() {
  const params = useParams();
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
      <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#EBECEF] print:hidden">
        <div className="flex items-center gap-3">
          <BackButton href={`/customer/orders/${orderId}`} label="Order Tracking" />
          <h1 className="text-xl font-bold text-[#14161A] tracking-tight">Order Invoice</h1>
        </div>

        {invoice && (
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0D5C5A] text-white hover:bg-[#0A4846] shadow-xs"
          >
            Print Invoice
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-[#78879A]">Loading invoice...</div>
      ) : error ? (
        <div className="p-8 text-center text-xs text-rose-600 bg-rose-50 rounded-2xl border border-rose-200">
          <span className="font-bold text-[11px] uppercase block mb-1">Notice</span>
          {error}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#EBECEF] p-8 shadow-xs space-y-6 text-xs text-[#14161A] print:border-none print:shadow-none print:p-0">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#EBECEF] pb-6">
            <div>
              <div>
                <span className="text-lg font-bold text-[#0F172A] tracking-tight block">
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
              <span className="text-base font-extrabold font-mono text-[#0D5C5A] block">
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

          <div className="grid grid-cols-2 gap-4 border-b border-[#EBECEF] pb-4">
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
              <thead className="bg-[#F8F9FB] border-b border-[#EBECEF] text-[#78879A] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Medicine Description</th>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                  <th className="py-2.5 px-3 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBECEF]">
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
                    <td className="py-3 px-3 text-right font-bold text-[#0F172A]">
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
              <div className="flex justify-between border-t border-[#EBECEF] pt-2 font-bold text-sm text-[#0F172A]">
                <span>Total Amount:</span>
                <span className="text-base text-[#0D5C5A]">₹{invoice.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
