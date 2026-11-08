'use client';

import * as React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiFetch } from '@/lib/api/client';
import { OrderDTO, OrderStatusHistoryDTO } from '@pharmacy/shared-types';
import { MissingPrescriptionIllustration } from '@/components/customer/MissingPrescriptionIllustration';

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
  decision: string | null;
  pharmacistNotes: string | null;
  requiresReupload: boolean;
  reviewedAt: string | null;
  pharmacistName: string | null;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  totalAmount: number;
  items: VerificationItem[];
}

export default function CustomerOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = params.id as string;
  const isJustPlaced = searchParams.get('placed') === 'true';

  const [order, setOrder] = React.useState<OrderDTO | null>(null);
  const [history, setHistory] = React.useState<OrderStatusHistoryDTO[]>([]);
  const [verification, setVerification] = React.useState<VerificationStatusData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [cancelling, setCancelling] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  // Preview Modal
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [previewImageError, setPreviewImageError] = React.useState(false);

  const fetchOrderDetails = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [orderRes, historyRes, verifRes] = await Promise.all([
        apiFetch<OrderDTO>(`/customer/orders/${orderId}`),
        apiFetch<OrderStatusHistoryDTO[]>(`/customer/orders/${orderId}/history`),
        apiFetch<VerificationStatusData>(`/customer/orders/${orderId}/verification`).catch(
          () => null,
        ),
      ]);

      setOrder(orderRes);
      setHistory(historyRes || []);
      setVerification(verifRes);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load order details.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  React.useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  // Polling for live status updates if order is in active processing
  React.useEffect(() => {
    if (!order) return;
    const activeStatuses = [
      'PENDING_VERIFICATION',
      'UNDER_REVIEW',
      'ROUTING',
      'ALLOCATED_TO_STORE',
      'PICKING',
      'PACKED',
    ];

    if (!activeStatuses.includes(order.status)) return;

    const interval = setInterval(async () => {
      try {
        const [updatedOrder, verifRes] = await Promise.all([
          apiFetch<OrderDTO>(`/customer/orders/${orderId}`),
          apiFetch<VerificationStatusData>(`/customer/orders/${orderId}/verification`).catch(
            () => null,
          ),
        ]);
        if (updatedOrder) setOrder(updatedOrder);
        if (verifRes) setVerification(verifRes);
      } catch {
        // Silent poll error
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [order, orderId]);

  const handleCancelOrder = async () => {
    if (
      !confirm('Are you sure you want to cancel this order? This cannot be undone once processed.')
    ) {
      return;
    }

    setCancelling(true);
    try {
      const updated = await apiFetch<OrderDTO>(`/customer/orders/${orderId}/cancel`, {
        method: 'POST',
      });
      setOrder(updated);
      alert('Order cancelled successfully.');
    } catch (err: unknown) {
      alert((err as Error).message || 'Unable to cancel order at this stage.');
    } finally {
      setCancelling(false);
    }
  };

  const handlePreviewPrescription = async (prescriptionId: string) => {
    setPreviewLoading(true);
    setPreviewImageError(false);
    setPreviewUrl(null);
    setPreviewOpen(true);
    try {
      const res = await apiFetch<{ url?: string; viewUrl?: string; exists?: boolean }>(
        `/customer/prescriptions/${prescriptionId}/preview-url`,
      );
      if (res.exists === false) {
        setPreviewUrl(null);
        setPreviewImageError(true);
      } else {
        setPreviewUrl(res.url || res.viewUrl || null);
      }
    } catch {
      setPreviewUrl(null);
      setPreviewImageError(true);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleAlternativeResponse = async (proposalId: string, action: 'ACCEPT' | 'DECLINE') => {
    setActionLoading(`alt-${proposalId}`);
    try {
      await apiFetch(`/customer/orders/${orderId}/alternatives/${proposalId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      await fetchOrderDetails();
    } catch (err: unknown) {
      alert((err as Error).message || `Failed to ${action.toLowerCase()} alternative.`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveItem = async (orderItemId: string) => {
    if (!confirm('Remove this rejected/blocked item so the rest of your order can proceed?'))
      return;
    setActionLoading(`remove-${orderItemId}`);
    try {
      await apiFetch(`/customer/orders/${orderId}/items/${orderItemId}`, {
        method: 'DELETE',
      });
      await fetchOrderDetails();
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to remove order item.');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (
    status: string,
  ): 'warning' | 'success' | 'danger' | 'information' => {
    switch (status) {
      case 'PENDING_VERIFICATION':
        return 'warning';
      case 'UNDER_REVIEW':
        return 'information';
      case 'APPROVED':
      case 'READY_FOR_HANDOVER':
      case 'HANDED_OVER':
      case 'DELIVERED':
        return 'success';
      case 'CANCELLED':
      case 'VERIFICATION_FAILED':
      case 'STOCK_UNAVAILABLE':
        return 'danger';
      default:
        return 'information';
    }
  };

  if (loading) {
    return (
      <div className="max-w-[950px] mx-auto py-12 text-center text-xs text-slate-500">
        Loading order details...
      </div>
    );
  }

  if (error || !order) {
    return (
      <Card className="max-w-[700px] mx-auto p-8 border-red-200 bg-red-50 text-center">
        <span className="text-xs uppercase font-bold text-red-600 block mb-1">Notice</span>
        <p className="text-sm text-red-700 font-medium">{error || 'Order not found.'}</p>
        <Button size="sm" onClick={() => router.push('/customer/orders')} className="mt-4 text-xs">
          View All Orders
        </Button>
      </Card>
    );
  }

  const isCancellable = order.status === 'PENDING_VERIFICATION' || order.status === 'UNDER_REVIEW';
  const isReuploadRequested = verification?.requiresReupload;

  return (
    <div className="max-w-[1000px] mx-auto space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="space-y-2">
        <button
          onClick={() => router.push('/customer/orders')}
          className="inline-flex items-center text-xs font-semibold text-[#0D5C5A] hover:underline"
        >
          &larr; Back to Orders
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#EBECEF]">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
                {order.orderNumber}
              </h1>
              <StatusBadge
                status={getStatusColor(order.status)}
                label={order.status.replace(/_/g, ' ')}
              />
            </div>
            <p className="text-xs text-[#78879A] mt-1">
              Placed on{' '}
              {new Date(order.placedAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(order.status === 'APPROVED' ||
              order.status === 'ROUTING_PENDING' ||
              order.status === 'STOCK_RESERVED' ||
              (order.status as string) === 'ROUTING' ||
              (order.status as string) === 'ALLOCATED_TO_STORE' ||
              order.status === 'PICKING' ||
              order.status === 'PACKED' ||
              order.status === 'READY_FOR_HANDOVER' ||
              order.status === 'HANDED_OVER') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/customer/orders/${orderId}/invoice`)}
                className="text-xs h-9 px-3 border-[#0D5C5A]/40 text-[#0D5C5A] hover:bg-[#F0FDFA] inline-flex items-center gap-1.5"
              >
                View Invoice
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
                {cancelling ? 'Cancelling...' : 'Cancel Order'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {isJustPlaced && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 flex items-start gap-3">
          <span className="font-bold text-[11px] uppercase px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900">
            CONFIRMED
          </span>
          <div>
            <strong className="block font-semibold text-emerald-900 mb-0.5">
              Order Submitted Successfully
            </strong>
            Your order has been recorded in <span className="font-mono">PENDING_VERIFICATION</span>{' '}
            status. A licensed pharmacist will inspect your attached prescription and verify
            medicines prior to hub dispatch.
          </div>
        </div>
      )}

      {/* Multi-Store Split Prescription Fulfilment Notice */}
      {(order as any).siblingOrders && (order as any).siblingOrders.length > 0 && (
        <Card className="p-4 border-[#0D5C5A]/30 bg-[#F0FDFA] shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs uppercase px-2 py-0.5 rounded bg-[#0D5C5A] text-white">
              Bundle Fulfilment
            </span>
            <span className="font-bold text-xs text-[#0F172A]">
              Multi-Store Prescription Dispatch ({(order as any).siblingOrders.length + 1} Total Shipments)
            </span>
          </div>
          <p className="text-xs text-slate-600">
            To ensure complete medicine availability without delay, your prescription was automatically split across our nearest pharmacy stores under a single bundle payment.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="text-xs font-semibold text-[#0D5C5A] bg-white border border-[#0D5C5A]/40 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <span>Current: #{order.orderNumber}</span>
              {(order as any).fulfilmentStore && (
                <span className="text-[11px] text-slate-500 font-normal">
                  ({(order as any).fulfilmentStore.name})
                </span>
              )}
            </span>
            {(order as any).siblingOrders.map((sib: any) => (
              <button
                key={sib.id}
                onClick={() => router.push(`/customer/orders/${sib.id}`)}
                className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:border-[#0D5C5A] px-3 py-1.5 rounded-lg hover:text-[#0D5C5A] flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <span>Shipment: #{sib.orderNumber}</span>
                {sib.fulfilmentStore && (
                  <span className="text-[11px] text-slate-400 font-normal">
                    ({sib.fulfilmentStore.name})
                  </span>
                )}
                <span className="text-[#0D5C5A] font-bold">&rarr;</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Re-upload Requested Banner */}
      {isReuploadRequested && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-xs text-amber-900 shadow-xs">
          <div className="flex items-start gap-3">
            <span className="font-bold text-[11px] uppercase px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
              RE-UPLOAD
            </span>
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
                Please upload a clearer, complete photo or PDF showing doctor name, date, patient
                details, and signatures.
              </p>
              <div className="pt-1">
                <Button
                  size="sm"
                  onClick={() => router.push('/customer/prescriptions')}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 px-3 inline-flex items-center gap-1.5"
                >
                  Upload Replacement Prescription &rarr;
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock Unavailable Alert */}
      {order.status === 'STOCK_UNAVAILABLE' && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-900 shadow-xs flex items-start gap-3">
          <span className="font-bold text-[11px] uppercase px-1.5 py-0.5 rounded bg-rose-200 text-rose-900">
            STOCK ALERT
          </span>
          <div className="space-y-1">
            <strong className="block text-sm font-bold text-rose-950">
              Stock Temporarily Unavailable at Fulfillment Stores
            </strong>
            <p className="leading-relaxed">
              Our automated system checked candidate fulfillment stores, but none currently hold
              complete available stock for your prescribed items. An admin has been alerted to
              review replenishment and retry store routing shortly.
            </p>
          </div>
        </div>
      )}

      {/* Verification / Fulfilment Stage Notice */}
      {!isReuploadRequested && (
        <div className="rounded-xl border border-[#EBECEF] bg-[#F0FDFA] p-4 text-xs text-[#0F172A] flex items-start gap-3">
          <span className="font-bold text-[11px] uppercase px-1.5 py-0.5 rounded bg-[#0D5C5A]/10 text-[#0D5C5A]">
            CLINICAL REVIEW
          </span>
          <div className="leading-relaxed">
            <strong className="block font-semibold text-[#0D5C5A] mb-0.5">
              Pharmacist Verification Status:{' '}
              {verification?.reviewStatus?.replace(/_/g, ' ') || 'PENDING'}
            </strong>
            Orders undergo deterministic compliance evaluation and registered pharmacist
            verification. Only authenticated pharmacists can authorize dispensing.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Items & Details (Col 8) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Order Items Table Card with Verification Actions */}
          <Card className="border-[#EBECEF] bg-white overflow-hidden shadow-xs">
            <CardHeader className="py-4 px-5 border-b border-slate-100 bg-[#F8F9FB] flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-[#0F172A]">
                Prescribed Medicines &amp; Verification Status ({order.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {order.items.map((item) => {
                  const verifItem = verification?.items?.find((v) => v.orderItemId === item.id);
                  const isApproved = verifItem?.reviewStatus === 'APPROVED';
                  const isRejected =
                    verifItem?.reviewStatus === 'REJECTED' || item.status === 'REJECTED';
                  const isBlocked =
                    verifItem?.reviewStatus === 'BLOCKED' ||
                    (item.status as string) === 'CANCELLED';
                  const proposal = verifItem?.pendingAlternative;

                  return (
                    <div key={item.id} className="p-4 space-y-3 text-xs">
                      <div className="flex items-start justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#0F172A]">
                              {item.medicineNameSnapshot}
                            </span>
                            {isApproved && (
                              <span className="inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Approved
                              </span>
                            )}
                            {isRejected && (
                              <span className="inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Rejected
                              </span>
                            )}
                            {isBlocked && (
                              <span className="inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
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
                          <span className="font-extrabold text-sm text-[#0F172A] block">
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
                              {actionLoading === `remove-${item.id}`
                                ? 'Removing...'
                                : 'Remove Item'}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Pharmacist Rejection / Block Reason */}
                      {(isRejected || isBlocked) && verifItem?.decisionReason && (
                        <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-200 text-rose-800 text-[11px] flex items-start gap-2">
                          <span className="font-bold text-[10px] uppercase px-1 py-0.5 rounded bg-rose-200">
                            NOTE
                          </span>
                          <div>
                            <span className="font-semibold block">Pharmacist Note:</span>
                            {verifItem.decisionReason}
                          </div>
                        </div>
                      )}

                      {/* Generic Alternative Proposal Card */}
                      {proposal && (
                        <div className="p-3 bg-[#F0FDFA] border border-[#EBECEF] rounded-xl space-y-2.5 text-xs text-[#0F172A]">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#0D5C5A]">
                              Generic Alternative Proposed by Pharmacist
                            </span>
                            <span className="font-mono text-[10px] text-[#0D5C5A] font-semibold uppercase">
                              Same Active Ingredient
                            </span>
                          </div>
                          <p className="text-[11px] text-[#78879A]">
                            The pharmacist suggested this bioequivalent alternative with active
                            molecule <strong>{proposal.activeIngredient}</strong> (
                            {proposal.strength}, {proposal.dosageForm}):
                          </p>
                          <div className="grid grid-cols-2 gap-2 p-2 bg-white rounded-lg border border-[#EBECEF] text-[11px]">
                            <div>
                              <span className="text-slate-400 block text-[10px]">
                                Current Selection
                              </span>
                              <span className="font-bold text-slate-800">
                                {proposal.originalMedicine.name}
                              </span>
                              <div className="text-slate-500 font-mono">
                                ₹{proposal.originalMedicine.mrp.toFixed(2)}
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">
                                Proposed Alternative
                              </span>
                              <span className="font-bold text-[#0D5C5A]">
                                {proposal.proposedMedicine.name}
                              </span>
                              <div className="text-emerald-600 font-mono font-bold">
                                ₹{proposal.proposedMedicine.mrp.toFixed(2)}
                                {proposal.priceDifference < 0
                                  ? ` (Save ₹${Math.abs(proposal.priceDifference).toFixed(2)})`
                                  : ''}
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
                              className="bg-[#0D5C5A] hover:bg-[#0A4846] text-white text-[11px] h-7 px-3"
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
            <Card className="border-[#EBECEF] bg-white p-5 space-y-2">
              <div className="text-xs font-bold text-[#0F172A] border-b border-slate-100 pb-2">
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
                  {order.addressSnapshot.city}, {order.addressSnapshot.state} —{' '}
                  {order.addressSnapshot.postalCode}
                </p>
              </div>
            </Card>

            {/* Patient & Prescription Info */}
            <Card className="border-[#EBECEF] bg-white p-5 space-y-2">
              <div className="text-xs font-bold text-[#0F172A] border-b border-slate-100 pb-2">
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
                      <span
                        className="font-medium text-slate-800 truncate"
                        title={order.prescription.originalFileName}
                      >
                        {order.prescription.originalFileName}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreviewPrescription(order.prescriptionId)}
                        className="text-[11px] h-7 px-2 border-[#0D5C5A]/30 text-[#0D5C5A]"
                      >
                        Preview
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Status History Timeline */}
          <Card className="border-[#EBECEF] bg-white p-5 space-y-3">
            <CardTitle className="text-sm font-bold text-[#0F172A]">
              Order Lifecycle &amp; Status History
            </CardTitle>
            <div className="relative pl-6 space-y-4 border-l-2 border-[#EBECEF] ml-2 pt-1">
              {history.map((hist) => (
                <div key={hist.id} className="relative">
                  <div className="absolute -left-[31px] top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#0D5C5A] shadow-xs" />
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
                      <p className="text-slate-600 mt-0.5 text-[11px] leading-normal">
                        {hist.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Payment & Price Breakdown (Col 4) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-[#EBECEF] bg-white p-5 space-y-4">
            <CardTitle className="text-sm font-bold text-[#0F172A]">Payment Summary</CardTitle>

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
                <span className="font-semibold text-slate-900">
                  ₹{(verification?.subtotal ?? order.subtotal).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Delivery Fee:</span>
                <span className="font-semibold">
                  ₹{(verification?.deliveryFee ?? order.deliveryFee).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Discount:</span>
                <span>₹{(verification?.discount ?? order.discount).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between items-baseline pt-1">
              <span className="font-bold text-sm text-[#0F172A]">Total Amount</span>
              <span className="font-extrabold text-2xl text-[#0D5C5A]">
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
            <DialogTitle className="text-base font-bold text-[#0F172A]">
              Prescription Document
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-2 bg-slate-900/5 rounded-lg flex items-center justify-center min-h-[400px]">
            {previewLoading ? (
              <div className="text-xs text-slate-500">Loading document securely...</div>
            ) : previewUrl && !previewImageError ? (
              order?.prescription?.originalFileName?.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewUrl}
                  title="Prescription Document"
                  className="w-full h-[550px] rounded border border-slate-200"
                  onError={() => setPreviewImageError(true)}
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewUrl}
                  alt="Prescription Document"
                  onError={() => setPreviewImageError(true)}
                  className="max-h-[550px] max-w-full object-contain rounded"
                />
              )
            ) : (
              <MissingPrescriptionIllustration
                fileName={order?.prescription?.originalFileName}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
