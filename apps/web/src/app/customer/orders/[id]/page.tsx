'use client';

import * as React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiFetch } from '@/lib/api/client';
import {
  ChevronLeft,
  MapPin,
  User,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Eye,
  AlertTriangle,
  ArrowRight,
  Trash2,
  ShieldCheck,
  RefreshCw,
  UploadCloud,
  FileText,
} from 'lucide-react';
import { OrderDTO, OrderStatusHistoryDTO } from '@pharmacy/shared-types';

interface VerificationItem {
  orderItemId: string;
  medicineId: string;
  medicineName: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  orderItemStatus: string;
  reviewStatus: string;
  reviewedMedicineName: string | null;
  decisionReason: string | null;
  pendingAlternative: {
    id: string;
    activeIngredient: string;
    strength: string;
    dosageForm: string;
    packSize: number;
    priceDifference: number;
    reason: string;
    originalMedicine: { id: string; name: string; mrp: number };
    proposedMedicine: { id: string; name: string; mrp: number };
  } | null;
}

interface VerificationStatusData {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  prescriptionId: string;
  prescriptionStatus: string;
  reviewStatus: string | null;
  pharmacistNotes: string | null;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  totalAmount: number;
  items: VerificationItem[];
}

export default function CustomerOrderDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = params.id as string;
  const isJustPlaced = searchParams.get('placed') === 'true';

  const [order, setOrder] = React.useState<OrderDTO | null>(null);
  const [history, setHistory] = React.useState<OrderStatusHistoryDTO[]>([]);
  const [verification, setVerification] = React.useState<VerificationStatusData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Cancellation State
  const [cancelling, setCancelling] = React.useState(false);

  // Action busy states
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  // Preview Dialog State
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);

  const fetchOrderDetails = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [orderRes, histRes, verifRes] = await Promise.all([
        apiFetch<OrderDTO>(`/customer/orders/${orderId}`),
        apiFetch<OrderStatusHistoryDTO[]>(`/customer/orders/${orderId}/history`),
        apiFetch<VerificationStatusData>(`/customer/orders/${orderId}/verification`).catch(() => null),
      ]);
      setOrder(orderRes);
      setHistory(histRes || []);
      setVerification(verifRes);
    } catch (err: unknown) {
      setError((err as Error).message || 'Order not found or unauthorized.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  React.useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  const handleCancelOrder = async () => {
    if (!confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      return;
    }

    setCancelling(true);
    try {
      await apiFetch(`/customer/orders/${orderId}/cancel`, {
        method: 'POST',
      });
      await fetchOrderDetails();
    } catch (err: unknown) {
      alert((err as Error).message || 'Order could not be cancelled.');
    } finally {
      setCancelling(false);
    }
  };

  const handlePreviewPrescription = async (prescriptionId: string) => {
    setPreviewLoading(true);
    setPreviewOpen(true);
    try {
      const res = await apiFetch<{ viewUrl: string }>(`/customer/prescriptions/${prescriptionId}/file`);
      setPreviewUrl(res.viewUrl);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to load prescription document.');
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleRemoveItem = async (orderItemId: string) => {
    if (!confirm('Are you sure you want to remove this item from your order? The total amount will be recalculated.')) {
      return;
    }
    setActionLoading(`remove-${orderItemId}`);
    try {
      await apiFetch(`/customer/orders/${orderId}/items/${orderItemId}/remove`, {
        method: 'POST',
      });
      await fetchOrderDetails();
    } catch (err: any) {
      alert(err?.message || 'Failed to remove item from order.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAlternativeResponse = async (alternativeId: string, action: 'ACCEPT' | 'DECLINE') => {
    setActionLoading(`alt-${alternativeId}`);
    try {
      await apiFetch(`/customer/orders/${orderId}/alternatives/${alternativeId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      await fetchOrderDetails();
    } catch (err: any) {
      alert(err?.message || `Failed to ${action.toLowerCase()} alternative.`);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string): 'warning' | 'purple' | 'success' | 'danger' | 'information' => {
    switch (status) {
      case 'PENDING_VERIFICATION':
        return 'warning';
      case 'UNDER_REVIEW':
        return 'purple';
      case 'AWAITING_CUSTOMER_ACTION':
        return 'warning';
      case 'ROUTING_PENDING':
      case 'STOCK_RESERVED':
      case 'PICKING':
      case 'PACKED':
      case 'READY_FOR_HANDOVER':
        return 'purple';
      case 'APPROVED':
      case 'PARTIALLY_APPROVED':
      case 'DELIVERED':
      case 'HANDED_OVER':
        return 'success';
      case 'CANCELLED':
      case 'VERIFICATION_FAILED':
      case 'REJECTED':
      case 'STOCK_UNAVAILABLE':
      case 'FULFILMENT_CANCELLED':
        return 'danger';
      default:
        return 'information';
    }
  };

  if (loading) {
    return (
      <div className="max-w-[850px] mx-auto py-12 text-center text-xs text-slate-500">
        Loading order details...
      </div>
    );
  }

  if (error || !order) {
    return (
      <Card className="max-w-[700px] mx-auto p-8 border-red-200 bg-red-50 text-center">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <h2 className="text-base font-semibold text-red-800">Order Not Found</h2>
        <p className="text-xs text-red-600 mt-1">{error || 'This order does not exist or belongs to another user.'}</p>
        <Button
          size="sm"
          onClick={() => router.push('/customer/orders')}
          className="mt-4 text-xs"
        >
          Back to Orders
        </Button>
      </Card>
    );
  }

  const isCancellable = order.status === 'PENDING_VERIFICATION';
  const isReuploadRequested = verification?.reviewStatus === 'REUPLOAD_REQUESTED';
  const isAwaitingCustomer = order.status === 'AWAITING_CUSTOMER_ACTION' || isReuploadRequested;

  return (
    <div className="max-w-[950px] mx-auto space-y-6">
      {/* Back Button & Header */}
      <div>
        <button
          onClick={() => router.push('/customer/orders')}
          className="inline-flex items-center text-xs font-semibold text-[#6240E8] hover:underline mb-2"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to All Orders
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#EAE8F0]">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-[#351F65]">
                {order.orderNumber}
              </h1>
              <StatusBadge
                status={getStatusColor(order.status)}
                label={order.status.replace(/_/g, ' ')}
              />
            </div>
            <p className="text-xs text-[#78879A] mt-1">
              Placed on {new Date(order.placedAt).toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(order.status === 'PACKED' || order.status === 'READY_FOR_HANDOVER' || order.status === 'HANDED_OVER') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/customer/orders/${orderId}/invoice`)}
                className="text-xs h-9 px-3 border-[#6240E8]/40 text-[#6240E8] hover:bg-purple-50 inline-flex items-center gap-1.5"
              >
                <FileText className="h-4 w-4" />
                <span>View Invoice</span>
              </Button>
            )}

            {isCancellable && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="text-xs h-9 px-3 text-red-600 border-red-300 hover:bg-red-50 self-start sm:self-auto"
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                <span>{cancelling ? 'Cancelling...' : 'Cancel Order'}</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {isJustPlaced && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-semibold text-emerald-900 mb-0.5">
              Order Submitted Successfully
            </strong>
            Your order has been recorded in <span className="font-mono">PENDING_VERIFICATION</span> status. A licensed pharmacist will inspect your attached prescription and verify medicines prior to hub dispatch.
          </div>
        </div>
      )}

      {/* Re-upload Requested Banner */}
      {isReuploadRequested && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-xs text-amber-900 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <div>
                <strong className="block text-sm font-bold text-amber-950 mb-0.5">
                  Prescription Re-upload Requested by Pharmacist
                </strong>
                <p className="text-amber-800 leading-relaxed">
                  The reviewing pharmacist could not verify your attached prescription document:
                </p>
                {verification?.pharmacistNotes && (
                  <div className="mt-2 p-3 bg-white rounded-lg border border-amber-200 font-mono text-xs text-amber-900 italic">
                    &quot;{verification.pharmacistNotes}&quot;
                  </div>
                )}
              </div>
              <p className="text-[11px] text-amber-700">
                Please upload a clearer, complete photo or PDF showing doctor name, date, patient details, and signatures.
              </p>
              <div className="pt-1">
                <Button
                  size="sm"
                  onClick={() => router.push('/customer/prescriptions')}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 px-3 inline-flex items-center gap-1.5"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  Upload Replacement Prescription
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock Unavailable Alert */}
      {order.status === 'STOCK_UNAVAILABLE' && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-900 shadow-xs flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="block text-sm font-bold text-rose-950">
              Stock Temporarily Unavailable at Fulfillment Stores
            </strong>
            <p className="leading-relaxed">
              Our automated system checked candidate fulfillment stores, but none currently hold complete available stock for your prescribed items.
              An admin has been alerted to review replenishment and retry store routing shortly.
            </p>
          </div>
        </div>
      )}

      {/* Verification / Fulfilment Stage Notice */}
      {!isReuploadRequested && (
        <div className="rounded-xl border border-[#D6D1F7] bg-[#F7F5FD] p-4 text-xs text-[#351F65] flex items-start gap-3">
          <Clock className="h-5 w-5 text-[#6240E8] shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="block font-semibold text-[#6240E8] mb-0.5">
              Pharmacist Verification Status: {verification?.reviewStatus?.replace(/_/g, ' ') || 'PENDING'}
            </strong>
            Orders undergo deterministic compliance evaluation and registered pharmacist verification. Only authenticated pharmacists can authorize dispensing.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Items & Details (Col 8) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Order Items Table Card with Verification Actions */}
          <Card className="border-[#EAE8F0] bg-white overflow-hidden shadow-xs">
            <CardHeader className="py-4 px-5 border-b border-slate-100 bg-[#F8F9FB] flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-[#351F65]">
                Prescribed Medicines &amp; Verification Status ({order.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {order.items.map((item) => {
                  const verifItem = verification?.items.find((v) => v.orderItemId === item.id);
                  const isRejected = verifItem?.reviewStatus === 'REJECTED' || item.status === 'REJECTED';
                  const isBlocked = verifItem?.reviewStatus === 'BLOCKED' || (item.status as string) === 'CANCELLED';
                  const isApproved = verifItem?.reviewStatus === 'APPROVED';
                  const proposal = verifItem?.pendingAlternative;

                  return (
                    <div key={item.id} className="p-4 space-y-3 text-xs">
                      <div className="flex items-start justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#351F65]">
                              {item.medicineNameSnapshot}
                            </span>
                            {isApproved && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                Approved
                              </span>
                            )}
                            {isRejected && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.2 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <XCircle className="w-3 h-3" />
                                Rejected
                              </span>
                            )}
                            {isBlocked && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.2 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertTriangle className="w-3 h-3" />
                                Blocked by Policy
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            SKU: {item.skuSnapshot}
                          </span>
                          <p className="text-slate-500">
                            ₹{item.unitPrice.toFixed(2)} &times; {item.quantity} unit(s)
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-sm text-[#351F65] block">
                            ₹{item.lineTotal.toFixed(2)}
                          </span>
                          {(isRejected || isBlocked) && order.status !== 'CANCELLED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveItem(item.id)}
                              disabled={actionLoading === `remove-${item.id}`}
                              className="mt-2 text-[11px] h-7 px-2.5 text-rose-600 border-rose-200 hover:bg-rose-50 inline-flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              {actionLoading === `remove-${item.id}` ? 'Removing...' : 'Remove Item'}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Pharmacist Rejection / Block Reason */}
                      {(isRejected || isBlocked) && verifItem?.decisionReason && (
                        <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-200 text-rose-800 text-[11px] flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold block">Pharmacist Note:</span>
                            {verifItem.decisionReason}
                          </div>
                        </div>
                      )}

                      {/* Generic Alternative Proposal Card */}
                      {proposal && (
                        <div className="p-3 bg-purple-50/70 border border-[#D6D1F7] rounded-xl space-y-2.5 text-xs text-[#351F65]">
                          <div className="flex items-center justify-between">
                            <span className="font-bold flex items-center gap-1 text-[#6240E8]">
                              <ShieldCheck className="w-4 h-4" />
                              Generic Alternative Proposed by Pharmacist
                            </span>
                            <span className="font-mono text-[10px] text-purple-700 font-semibold uppercase">
                              Same Active Ingredient
                            </span>
                          </div>
                          <p className="text-[11px] text-[#78879A]">
                            The pharmacist suggested this bioequivalent alternative with active molecule{' '}
                            <strong>{proposal.activeIngredient}</strong> ({proposal.strength}, {proposal.dosageForm}):
                          </p>
                          <div className="grid grid-cols-2 gap-2 p-2 bg-white rounded-lg border border-purple-100 text-[11px]">
                            <div>
                              <span className="text-slate-400 block text-[10px]">Current Selection</span>
                              <span className="font-bold text-slate-800">{proposal.originalMedicine.name}</span>
                              <div className="text-slate-500 font-mono">₹{proposal.originalMedicine.mrp.toFixed(2)}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Proposed Alternative</span>
                              <span className="font-bold text-[#6240E8]">{proposal.proposedMedicine.name}</span>
                              <div className="text-emerald-600 font-mono font-bold">
                                ₹{proposal.proposedMedicine.mrp.toFixed(2)}
                                {proposal.priceDifference < 0 ? ` (Save ₹${Math.abs(proposal.priceDifference).toFixed(2)})` : ''}
                              </div>
                            </div>
                          </div>
                          {proposal.reason && (
                            <p className="text-[11px] italic text-slate-600">
                              Reason: &quot;{proposal.reason}&quot;
                            </p>
                          )}
                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              size="sm"
                              onClick={() => handleAlternativeResponse(proposal.id, 'ACCEPT')}
                              disabled={actionLoading === `alt-${proposal.id}`}
                              className="bg-[#6240E8] hover:bg-[#5232d4] text-white text-[11px] h-7 px-3"
                            >
                              Accept Alternative
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAlternativeResponse(proposal.id, 'DECLINE')}
                              disabled={actionLoading === `alt-${proposal.id}`}
                              className="text-[11px] h-7 px-3 border-slate-300 text-slate-700 hover:bg-slate-50"
                            >
                              Decline
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Delivery Address & Patient Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Delivery Address Snapshot */}
            <Card className="border-[#EAE8F0] bg-white p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#351F65] border-b border-slate-100 pb-2">
                <MapPin className="h-4 w-4 text-[#6240E8]" />
                <span>Delivery Address (Snapshot)</span>
              </div>
              <div className="text-xs text-slate-600 space-y-1 pt-1">
                <p className="font-bold text-slate-900">{order.addressSnapshot.recipientName}</p>
                <p className="text-slate-500">+91 {order.addressSnapshot.phone}</p>
                <p className="text-slate-700 leading-relaxed">
                  {order.addressSnapshot.addressLine1}
                  {order.addressSnapshot.addressLine2 && `, ${order.addressSnapshot.addressLine2}`}
                  {order.addressSnapshot.landmark && ` (Near ${order.addressSnapshot.landmark})`}
                </p>
                <p className="font-medium text-slate-800">
                  {order.addressSnapshot.city}, {order.addressSnapshot.state} — {order.addressSnapshot.postalCode}
                </p>
              </div>
            </Card>

            {/* Patient & Prescription Info */}
            <Card className="border-[#EAE8F0] bg-white p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#351F65] border-b border-slate-100 pb-2">
                <User className="h-4 w-4 text-[#6240E8]" />
                <span>Patient &amp; Prescription</span>
              </div>
              <div className="text-xs text-slate-600 space-y-2 pt-1">
                <div>
                  <span className="text-slate-400 block text-[11px]">Patient:</span>
                  <span className="font-semibold text-slate-900">
                    {order.familyMember
                      ? `${order.familyMember.fullName} (${order.familyMember.relationship})`
                      : 'Self (Account Owner)'}
                  </span>
                </div>

                {order.prescription && (
                  <div>
                    <span className="text-slate-400 block text-[11px]">Attached Rx:</span>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="font-medium text-slate-800 truncate" title={order.prescription.originalFileName}>
                        {order.prescription.originalFileName}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreviewPrescription(order.prescriptionId)}
                        className="text-[11px] h-7 px-2 border-[#6240E8]/30 text-[#6240E8]"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Status History Timeline */}
          <Card className="border-[#EAE8F0] bg-white p-5 space-y-3">
            <CardTitle className="text-sm font-bold text-[#351F65]">
              Order Lifecycle &amp; Status History
            </CardTitle>
            <div className="relative pl-6 space-y-4 border-l-2 border-purple-100 ml-2 pt-1">
              {history.map((hist) => (
                <div key={hist.id} className="relative">
                  <div className="absolute -left-[31px] top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#6240E8] shadow-xs" />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900">
                      {hist.newStatus.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] text-slate-400 ml-2">
                      {new Date(hist.createdAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                    {hist.note && (
                      <p className="text-slate-600 mt-0.5 text-[11px] leading-normal">{hist.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Payment & Price Breakdown (Col 4) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-[#EAE8F0] bg-white p-5 space-y-4">
            <CardTitle className="text-sm font-bold text-[#351F65]">
              Payment Summary
            </CardTitle>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Method:</span>
                <span className="font-bold text-slate-900">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Payment Status:</span>
                <span className="font-semibold text-slate-800">{order.paymentStatus}</span>
              </div>
              {order.payment?.transactionReference && (
                <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Txn Ref:</span>
                  <span className="font-mono text-[10px] text-slate-700 truncate max-w-[150px]">
                    {order.payment.transactionReference}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2 text-xs text-slate-600 border-b border-slate-100 pb-3">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-900">₹{(verification?.subtotal ?? order.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Delivery Fee:</span>
                <span className="font-semibold">₹{(verification?.deliveryFee ?? order.deliveryFee).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Discount:</span>
                <span>₹{(verification?.discount ?? order.discount).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between items-baseline pt-1">
              <span className="font-bold text-sm text-[#351F65]">Total Amount</span>
              <span className="font-extrabold text-2xl text-[#6240E8]">
                ₹{(verification?.totalAmount ?? order.totalAmount).toFixed(2)}
              </span>
            </div>

            {order.customerNote && (
              <div className="p-3 bg-slate-50 rounded-lg text-xs border border-slate-100">
                <span className="font-semibold text-slate-700 block text-[11px] uppercase mb-0.5">
                  Delivery Note:
                </span>
                <p className="text-slate-600 italic">&quot;{order.customerNote}&quot;</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Prescription Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#351F65]">
              Prescription Document
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-2 bg-slate-900/5 rounded-lg flex items-center justify-center min-h-[400px]">
            {previewLoading ? (
              <div className="text-xs text-slate-500">Loading document securely...</div>
            ) : previewUrl ? (
              <iframe
                src={previewUrl}
                title="Prescription Document"
                className="w-full h-[550px] rounded border border-slate-200"
              />
            ) : (
              <div className="text-xs text-red-500">Failed to render prescription document.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
