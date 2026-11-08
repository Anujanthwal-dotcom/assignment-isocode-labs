'use client';

import * as React from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';
import { FileText, ShoppingBag, Search, AlertCircle, ShieldCheck } from 'lucide-react';

interface QueueItem {
  orderId: string;
  orderNumber: string;
  customerName: string;
  placedAt: string;
  orderStatus: string;
  prescriptionId: string;
  prescriptionStatus: string;
  reviewStatus: string;
  itemCount: number;
  medicineNames: string[];
  assignedStoreId: string;
  assignedStoreName: string;
}

interface PrescriptionQueueItem {
  id: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  status: string;
  uploadedAt: string;
  customerUserId: string;
  customerName: string;
  patientName: string;
  relationship: string;
  aiStatus: string;
  detectedCount: number;
  quoteStatus?: string | null;
}

export default function PharmacistReviewQueuePage() {
  const [activeTab, setActiveTab] = React.useState<'PRESCRIPTIONS' | 'ORDERS'>('PRESCRIPTIONS');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Data states
  const [prescriptions, setPrescriptions] = React.useState<PrescriptionQueueItem[]>([]);
  const [orders, setOrders] = React.useState<QueueItem[]>([]);

  // Filters
  const [orderStatusFilter, setOrderStatusFilter] = React.useState<string>('ALL');
  const [rxStatusFilter, setRxStatusFilter] = React.useState<string>('ALL');
  const [searchTerm, setSearchTerm] = React.useState('');

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === 'PRESCRIPTIONS') {
        const res = await apiFetch<{
          data: PrescriptionQueueItem[];
        }>('/pharmacist/prescription-queue');
        setPrescriptions(res.data || []);
      } else {
        const params = new URLSearchParams();
        if (orderStatusFilter !== 'ALL') {
          params.set('status', orderStatusFilter);
        }
        if (searchTerm.trim()) {
          params.set('search', searchTerm.trim());
        }

        const res = await apiFetch<{
          data: QueueItem[];
        }>(`/pharmacist/review-queue?${params.toString()}`);
        setOrders(res.data || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load verification queue.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, orderStatusFilter, searchTerm]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getRxStatusBadge = (status: string, quoteStatus?: string | null) => {
    if (quoteStatus === 'QUOTED') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          ✓ Quoted (₹ Sent)
        </span>
      );
    }
    if (quoteStatus === 'ACCEPTED') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          ✓ Ordered &amp; Paid
        </span>
      );
    }

    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Verified
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            In Verification
          </span>
        );
      case 'REUPLOAD_REQUIRED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Re-upload Req.
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Awaiting Review
          </span>
        );
    }
  };

  const filteredPrescriptions = React.useMemo(() => {
    return prescriptions.filter((p) => {
      if (rxStatusFilter !== 'ALL' && p.status !== rxStatusFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (
          p.customerName.toLowerCase().includes(term) ||
          p.patientName.toLowerCase().includes(term) ||
          p.originalFileName.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [prescriptions, rxStatusFilter, searchTerm]);

  return (
    <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
      {/* Header section with Store Scoping Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EBECEF]">
        <div>
          <h1 className="text-2xl font-bold text-[#14161A] tracking-tight">
            Pharmacist Verification &amp; Review Queue
          </h1>
          <p className="text-xs text-[#78879A] mt-1">
            Review doctor prescriptions, verify AI extracted medicines against catalogue, mark availability, and provide customer quotations.
          </p>
        </div>


      </div>

      {/* Main Queue Mode Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('PRESCRIPTIONS')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'PRESCRIPTIONS'
              ? 'border-[#0D5C5A] text-[#0D5C5A] bg-[#F0FDFA]/60 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Prescriptions Awaiting Review ({prescriptions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ORDERS')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'ORDERS'
              ? 'border-[#0D5C5A] text-[#0D5C5A] bg-[#F0FDFA]/60 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Orders Needing Verification ({orders.length})</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-[#EBECEF] p-3.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {activeTab === 'PRESCRIPTIONS' ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { label: 'All Prescriptions', value: 'ALL' },
              { label: 'Uploaded (New)', value: 'UPLOADED' },
              { label: 'Under Review', value: 'UNDER_REVIEW' },
              { label: 'Approved / Quoted', value: 'APPROVED' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setRxStatusFilter(tab.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  rxStatusFilter === tab.value
                    ? 'bg-[#0D5C5A] text-white shadow-xs'
                    : 'text-[#6C757D] hover:bg-[#F8F9FB] hover:text-[#0F172A]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { label: 'All Orders', value: 'ALL' },
              { label: 'Pending', value: 'PENDING' },
              { label: 'In Review', value: 'IN_REVIEW' },
              { label: 'Approved', value: 'APPROVED' },
              { label: 'Re-upload Req', value: 'REUPLOAD_REQUESTED' },
              { label: 'Rejected', value: 'REJECTED' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setOrderStatusFilter(tab.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  orderStatusFilter === tab.value
                    ? 'bg-[#0D5C5A] text-white shadow-xs'
                    : 'text-[#6C757D] hover:bg-[#F8F9FB] hover:text-[#0F172A]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <input
            type="text"
            placeholder={
              activeTab === 'PRESCRIPTIONS'
                ? 'Search customer, patient, or file...'
                : 'Search order number or customer...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#EBECEF] bg-[#F8F9FB] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D5C5A]/30"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Content Body */}
      {loading ? (
        <div className="bg-white rounded-xl border border-[#EBECEF] p-12 text-center shadow-2xs">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-[#0D5C5A] border-t-transparent" />
          <p className="text-xs text-[#78879A] mt-3">Loading queue items...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      ) : activeTab === 'PRESCRIPTIONS' ? (
        filteredPrescriptions.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#EBECEF] p-12 text-center shadow-2xs space-y-3">
            <h3 className="text-sm font-semibold text-[#14161A]">No prescriptions awaiting review</h3>
            <p className="text-xs text-[#78879A] max-w-sm mx-auto">
              All uploaded customer prescriptions have been verified or no prescriptions match the active filter.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#EBECEF] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#EBECEF] bg-[#F8F9FB] text-[#78879A] font-semibold">
                    <th className="py-3 px-4">Uploaded Document</th>
                    <th className="py-3 px-4">Patient / Customer</th>
                    <th className="py-3 px-4">Uploaded Date</th>
                    <th className="py-3 px-4">AI Extraction Status</th>
                    <th className="py-3 px-4">Verification &amp; Quotation</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBECEF]">
                  {filteredPrescriptions.map((rx) => (
                    <tr key={rx.id} className="hover:bg-[#F0FDFA]/50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-[#0F172A] block truncate max-w-[220px]" title={rx.originalFileName}>
                          {rx.originalFileName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {(rx.fileSizeBytes / 1024).toFixed(0)} KB &bull; {rx.mimeType}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-[#14161A] block">{rx.patientName}</span>
                        <span className="text-[10px] text-slate-400">
                          {rx.customerName} ({rx.relationship})
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#78879A]">
                        {new Date(rx.uploadedAt).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          rx.aiStatus === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : rx.aiStatus === 'PROCESSING' || rx.aiStatus === 'QUEUED'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {rx.aiStatus === 'COMPLETED' ? `✓ AI Draft (${rx.detectedCount} items)` : rx.aiStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4">{getRxStatusBadge(rx.status, rx.quoteStatus)}</td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/pharmacist/prescriptions/${rx.id}/verify`}
                          className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0D5C5A] text-white hover:bg-[#0A4846] transition-colors shadow-2xs"
                        >
                          Verify &amp; Quote &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#EBECEF] p-12 text-center shadow-2xs space-y-3">
          <h3 className="text-sm font-semibold text-[#14161A]">All caught up!</h3>
          <p className="text-xs text-[#78879A] max-w-sm mx-auto">
            There are no pending orders currently awaiting verification.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#EBECEF] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#EBECEF] bg-[#F8F9FB] text-[#78879A] font-semibold">
                  <th className="py-3 px-4">Order Number</th>
                  <th className="py-3 px-4">Placed Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Prescribed Medicines</th>
                  <th className="py-3 px-4">Verification Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBECEF]">
                {orders.map((item) => (
                  <tr key={item.orderId} className="hover:bg-[#F0FDFA]/50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#0F172A]">{item.orderNumber}</td>
                    <td className="py-3 px-4 text-[#78879A]">
                      {new Date(item.placedAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-medium text-[#14161A]">{item.customerName}</td>
                    <td className="py-3 px-4 text-[#6C757D] max-w-[260px] truncate">
                      {item.medicineNames.join(', ')} ({item.itemCount} item
                      {item.itemCount > 1 ? 's' : ''})
                    </td>
                    <td className="py-3 px-4">{getRxStatusBadge(item.reviewStatus)}</td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/pharmacist/orders/${item.orderId}/review`}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0D5C5A] text-white hover:bg-[#0A4846] transition-colors shadow-2xs"
                      >
                        Verify Rx &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
