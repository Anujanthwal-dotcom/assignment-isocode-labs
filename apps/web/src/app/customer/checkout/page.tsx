'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api/client';
import {
  User,
  Users,
  FileText,
  MapPin,
  CreditCard,
  Banknote,
  ShieldAlert,
  AlertCircle,
  Plus,
  ArrowRight,
} from 'lucide-react';
import {
  CartDTO,
  FamilyMemberDTO,
  CustomerAddressDTO,
  PrescriptionDTO,
  OrderDTO,
  OrderPaymentMethod,
} from '@pharmacy/shared-types';

export default function CustomerCheckoutPage() {
  const router = useRouter();

  // Data State
  const [cart, setCart] = React.useState<CartDTO | null>(null);
  const [familyMembers, setFamilyMembers] = React.useState<FamilyMemberDTO[]>([]);
  const [addresses, setAddresses] = React.useState<CustomerAddressDTO[]>([]);
  const [prescriptions, setPrescriptions] = React.useState<PrescriptionDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Selections
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = React.useState<string>(''); // '' = Self
  const [selectedPrescriptionId, setSelectedPrescriptionId] = React.useState<string>('');
  const [selectedAddressId, setSelectedAddressId] = React.useState<string>('');
  const [paymentMethod, setPaymentMethod] = React.useState<OrderPaymentMethod>('UPI');
  const [customerNote, setCustomerNote] = React.useState<string>('');

  // Inline Prescription Upload State
  const [inlineFile, setInlineFile] = React.useState<File | null>(null);
  const [uploadingInline, setUploadingInline] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  // Submitting
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const loadCheckoutData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [cartRes, famRes, addrRes, rxRes] = await Promise.all([
        apiFetch<CartDTO>('/customer/cart'),
        apiFetch<FamilyMemberDTO[]>('/customer/family-members'),
        apiFetch<CustomerAddressDTO[]>('/customer/addresses'),
        apiFetch<{ data: PrescriptionDTO[] }>('/customer/prescriptions'),
      ]);

      if (!cartRes || cartRes.items.length === 0) {
        router.replace('/customer/cart');
        return;
      }

      setCart(cartRes);
      setFamilyMembers(famRes || []);
      setAddresses(addrRes || []);
      setPrescriptions(rxRes?.data || []);

      // Auto-select default address if available
      const defaultAddr = addrRes?.find((a) => a.isDefault);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
      } else if (addrRes && addrRes.length > 0) {
        setSelectedAddressId(addrRes[0].id);
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load checkout details.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  React.useEffect(() => {
    loadCheckoutData();
  }, [loadCheckoutData]);

  // Filter prescriptions for currently selected patient
  const filteredPrescriptions = React.useMemo(() => {
    return prescriptions.filter((rx) => {
      if (selectedFamilyMemberId === '') {
        return !rx.familyMemberId;
      }
      return rx.familyMemberId === selectedFamilyMemberId;
    });
  }, [prescriptions, selectedFamilyMemberId]);

  // Handle inline upload
  const handleInlineUpload = async () => {
    if (!inlineFile) return;
    setUploadingInline(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', inlineFile);
    if (selectedFamilyMemberId) {
      formData.append('familyMemberId', selectedFamilyMemberId);
    }

    try {
      const newRx = await apiFetch<PrescriptionDTO>('/customer/prescriptions', {
        method: 'POST',
        body: formData,
      });

      setPrescriptions((prev) => [newRx, ...prev]);
      setSelectedPrescriptionId(newRx.id);
      setInlineFile(null);
    } catch (err: unknown) {
      setUploadError((err as Error).message || 'Failed to upload prescription.');
    } finally {
      setUploadingInline(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      setSubmitError('Please select a delivery address.');
      return;
    }

    if (!selectedPrescriptionId) {
      setSubmitError('Please select or upload a prescription for the order.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const order = await apiFetch<OrderDTO>('/customer/orders', {
        method: 'POST',
        body: JSON.stringify({
          familyMemberId: selectedFamilyMemberId ? selectedFamilyMemberId : null,
          prescriptionId: selectedPrescriptionId,
          addressId: selectedAddressId,
          paymentMethod,
          customerNote: customerNote.trim() || undefined,
        }),
      });

      if (paymentMethod === 'UPI') {
        router.replace(`/customer/payment/mock/${order.id}`);
      } else {
        router.replace(`/customer/orders/${order.id}?placed=true`);
      }
    } catch (err: unknown) {
      setSubmitError((err as Error).message || 'Failed to place order. Please verify cart items and prescription.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[950px] mx-auto py-12 text-center text-xs text-slate-500">
        Loading checkout...
      </div>
    );
  }

  if (error || !cart) {
    return (
      <Card className="max-w-[700px] mx-auto p-8 border-red-200 bg-red-50 text-center">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm text-red-700 font-medium">{error || 'Cart is empty.'}</p>
        <Button
          size="sm"
          onClick={() => router.push('/customer/cart')}
          className="mt-4 text-xs"
        >
          Return to Cart
        </Button>
      </Card>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-[#EAE8F0]">
        <h1 className="text-2xl font-bold tracking-tight text-[#351F65]">
          Order Checkout
        </h1>
        <p className="text-sm text-[#78879A] mt-1">
          Complete the required verification details to submit your pharmacy order.
        </p>
      </div>

      {/* Mandatory Pharmacist Review Notice */}
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="block font-semibold text-amber-800 mb-0.5">
            Mandatory Pharmacist Verification Notice
          </strong>
          Your order will be reviewed by a registered pharmacist at our Kolkata/Howrah hub before it can be processed. Placing an order does not mean the prescription has been approved.
        </div>
      </div>

      {submitError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2 font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Multi-section Steps (Col 8) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Section 1: Who is this order for? */}
          <Card className="border-[#EAE8F0] bg-white p-5 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#6240E8] text-white text-xs font-bold">
                1
              </span>
              <h2 className="font-bold text-sm text-[#351F65]">Select Patient</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedFamilyMemberId('');
                  setSelectedPrescriptionId('');
                }}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedFamilyMemberId === ''
                    ? 'border-[#6240E8] bg-[#F7F5FD] text-[#6240E8]'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs">
                  <User className="h-3.5 w-3.5" />
                  <span>Self (Owner)</span>
                </div>
              </button>

              {familyMembers.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => {
                    setSelectedFamilyMemberId(member.id);
                    setSelectedPrescriptionId('');
                  }}
                  className={`p-3 rounded-lg border text-left transition-all truncate ${
                    selectedFamilyMemberId === member.id
                      ? 'border-[#6240E8] bg-[#F7F5FD] text-[#6240E8]'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-xs truncate">
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{member.fullName}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block capitalize mt-0.5">
                    {member.relationship.toLowerCase()}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          {/* Section 2: Prescription Selection / Upload */}
          <Card className="border-[#EAE8F0] bg-white p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#6240E8] text-white text-xs font-bold">
                  2
                </span>
                <h2 className="font-bold text-sm text-[#351F65]">Attach Prescription *</h2>
              </div>
            </div>

            {filteredPrescriptions.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center space-y-2">
                <FileText className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-600">
                  No saved prescriptions found for {selectedFamilyMemberId ? 'this family member' : 'yourself'}.
                </p>
                <p className="text-[11px] text-slate-400">
                  Upload a prescription document below to proceed.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <span className="text-xs font-medium text-slate-600 block">
                  Choose from your uploaded prescriptions:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredPrescriptions.map((rx) => (
                    <button
                      key={rx.id}
                      type="button"
                      onClick={() => setSelectedPrescriptionId(rx.id)}
                      className={`p-3 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
                        selectedPrescriptionId === rx.id
                          ? 'border-[#6240E8] bg-[#F7F5FD] text-[#6240E8] shadow-2xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <FileText className="h-4 w-4 mt-0.5 shrink-0" />
                      <div className="truncate text-xs">
                        <span className="font-semibold block truncate">{rx.originalFileName}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(rx.uploadedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Inline Upload Option */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-xs font-medium text-slate-600 block mb-1.5">
                Or upload a new prescription now:
              </span>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="file"
                  id="checkoutRxUpload"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setInlineFile(e.target.files[0]);
                    }
                  }}
                  className="text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-[#6240E8] hover:file:bg-purple-100 cursor-pointer"
                />
                {inlineFile && (
                  <Button
                    size="sm"
                    type="button"
                    onClick={handleInlineUpload}
                    disabled={uploadingInline}
                    className="text-xs bg-[#6240E8] text-white hover:bg-[#5233D0] h-8 shrink-0"
                  >
                    {uploadingInline ? 'Uploading...' : 'Upload & Select'}
                  </Button>
                )}
              </div>
              {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
            </div>
          </Card>

          {/* Section 3: Delivery Address Selection */}
          <Card className="border-[#EAE8F0] bg-white p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#6240E8] text-white text-xs font-bold">
                  3
                </span>
                <h2 className="font-bold text-sm text-[#351F65]">Delivery Address *</h2>
              </div>
              <Link
                href="/customer/addresses"
                className="text-xs text-[#6240E8] font-semibold hover:underline flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                <span>Add New</span>
              </Link>
            </div>

            {addresses.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-lg text-center space-y-2">
                <MapPin className="h-6 w-6 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-600">You do not have any saved delivery addresses.</p>
                <Button
                  size="sm"
                  onClick={() => router.push('/customer/addresses')}
                  className="text-xs bg-[#6240E8] text-white"
                >
                  Add Delivery Address
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {addresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => setSelectedAddressId(addr.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedAddressId === addr.id
                        ? 'border-[#6240E8] bg-[#F7F5FD] text-[#351F65] shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{addr.label}</span>
                      {addr.isDefault && (
                        <span className="text-[9px] font-semibold bg-[#6240E8] text-white px-1.5 py-0.2 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-900 font-medium mt-1 truncate">{addr.recipientName} &bull; +91 {addr.phone}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                      {addr.addressLine1}, {addr.city} — {addr.postalCode}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Section 4: Payment Method */}
          <Card className="border-[#EAE8F0] bg-white p-5 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#6240E8] text-white text-xs font-bold">
                4
              </span>
              <h2 className="font-bold text-sm text-[#351F65]">Payment Method *</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  paymentMethod === 'UPI'
                    ? 'border-[#6240E8] bg-[#F7F5FD] text-[#351F65] shadow-2xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <CreditCard className="h-5 w-5 text-[#6240E8] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-sm block">UPI (Test Simulation)</span>
                  <span className="text-xs text-slate-500 mt-0.5 block leading-normal">
                    Instant mock payment test environment with SUCCESS and FAILURE simulation.
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('COD')}
                className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  paymentMethod === 'COD'
                    ? 'border-[#6240E8] bg-[#F7F5FD] text-[#351F65] shadow-2xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Banknote className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-sm block">Cash on Delivery (COD)</span>
                  <span className="text-xs text-slate-500 mt-0.5 block leading-normal">
                    No upfront payment required. Pay in cash or card upon pharmacy delivery.
                  </span>
                </div>
              </button>
            </div>
          </Card>

          {/* Section 5: Delivery Note */}
          <Card className="border-[#EAE8F0] bg-white p-5 space-y-2">
            <label className="text-xs font-semibold text-slate-700 block">
              Customer Delivery Note (Optional)
            </label>
            <Input
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              placeholder="e.g. Ring the bell twice, leave with security guard, etc."
              maxLength={500}
              className="h-10 text-xs"
            />
          </Card>
        </div>

        {/* Right Column: Order Review & Submit (Col 4) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-[#EAE8F0] bg-white p-5 space-y-4 sticky top-20">
            <CardTitle className="text-base font-bold text-[#351F65]">
              Order Summary
            </CardTitle>

            <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100 text-xs">
              {cart.items.map((item) => (
                <div key={item.id} className="pt-2 flex justify-between items-start gap-2">
                  <div className="truncate">
                    <span className="font-semibold text-slate-900 block truncate">{item.medicine.name}</span>
                    <span className="text-slate-400 text-[11px]">Qty: {item.quantity} &bull; ₹{item.unitPrice.toFixed(2)}</span>
                  </div>
                  <span className="font-bold text-slate-900 shrink-0">
                    ₹{item.lineTotal.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2 text-xs text-slate-600 border-t border-b border-slate-100 py-3">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-900">₹{cart.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Delivery Fee:</span>
                <span className="font-semibold">₹0.00</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Discount:</span>
                <span>₹0.00</span>
              </div>
            </div>

            <div className="flex justify-between items-baseline">
              <span className="font-bold text-sm text-[#351F65]">Total Payable</span>
              <span className="font-extrabold text-2xl text-[#6240E8]">
                ₹{cart.subtotal.toFixed(2)}
              </span>
            </div>

            <Button
              onClick={handlePlaceOrder}
              disabled={submitting || !selectedAddressId || !selectedPrescriptionId}
              className="w-full bg-[#6240E8] text-white hover:bg-[#5233D0] h-12 text-xs font-bold shadow-xs flex items-center justify-center gap-1.5"
            >
              <span>{submitting ? 'Placing Order...' : 'Confirm & Place Order'}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
