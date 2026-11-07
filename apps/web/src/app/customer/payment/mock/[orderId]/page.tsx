'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api/client';
import { OrderDTO, MockPaymentResponseDTO } from '@pharmacy/shared-types';

export default function CustomerMockPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [order, setOrder] = React.useState<OrderDTO | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [processing, setProcessing] = React.useState(false);
  const [result, setResult] = React.useState<MockPaymentResponseDTO | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const res = await apiFetch<OrderDTO>(`/customer/orders/${orderId}`);
        if (isMounted) setOrder(res);
      } catch (err: unknown) {
        if (isMounted) setError((err as Error).message || 'Failed to retrieve order details.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchOrder();
    return () => {
      isMounted = false;
    };
  }, [orderId]);

  const handleSimulate = async (action: 'SUCCESS' | 'FAILURE') => {
    setProcessing(true);
    try {
      const res = await apiFetch<MockPaymentResponseDTO>(
        `/customer/orders/${orderId}/mock-payment`,
        {
          method: 'POST',
          body: JSON.stringify({ result: action }),
        },
      );
      setResult(res);
    } catch (err: unknown) {
      alert((err as Error).message || 'Payment simulation failed.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[600px] mx-auto py-12 text-center text-xs text-slate-500">
        Loading test payment environment...
      </div>
    );
  }

  if (error || !order) {
    return (
      <Card className="max-w-[600px] mx-auto p-8 border-red-200 bg-red-50 text-center">
        <span className="text-xs uppercase font-bold text-red-600 block mb-1">Notice</span>
        <p className="text-sm text-red-700 font-medium">{error || 'Order not found.'}</p>
        <Button size="sm" onClick={() => router.push('/customer/orders')} className="mt-4 text-xs">
          View Orders
        </Button>
      </Card>
    );
  }

  return (
    <div className="max-w-[650px] mx-auto space-y-6">
      {/* Test Mode Banner */}
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 flex items-start gap-3">
        <span className="font-bold text-[11px] uppercase px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
          TEST GATEWAY
        </span>
        <div>
          <strong className="block font-semibold text-amber-800">
            TEST ENVIRONMENT — Mock UPI Gateway Simulation
          </strong>
          This is an automated simulation screen for testing the customer ordering workflow. No real
          financial transaction will take place and no real UPI credentials or PINs will ever be
          requested.
        </div>
      </div>

      <Card className="border-[#EBECEF] bg-white shadow-xs">
        <CardHeader className="pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-[#0F172A]">
              Simulate Mock UPI Payment
            </CardTitle>
            <span className="text-xs font-mono font-semibold text-[#0D5C5A] bg-[#F0FDFA] px-2 py-0.5 rounded">
              UPI Gateway
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Order Details */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Order Number:</span>
              <span className="font-mono font-bold text-slate-800">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Recipient:</span>
              <span className="font-semibold text-slate-800">
                {order.addressSnapshot.recipientName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Status:</span>
              <span className="font-semibold text-amber-700">{order.paymentStatus}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200 text-sm">
              <span className="font-bold text-slate-900">Total Payable Amount:</span>
              <span className="font-extrabold text-[#0D5C5A]">₹{order.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Result Banner if already simulated */}
          {result ? (
            <div
              className={`p-5 rounded-xl border text-center space-y-3 ${
                result.paymentStatus === 'SUCCESS'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-red-200 bg-red-50 text-red-900'
              }`}
            >
              {result.paymentStatus === 'SUCCESS' ? (
                <>
                  <span className="font-bold text-sm uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 inline-block">
                    ✓ SUCCESS
                  </span>
                  <div>
                    <h3 className="font-bold text-base text-emerald-900">
                      Payment Simulation Successful
                    </h3>
                    <p className="text-xs text-emerald-700 mt-1">{result.message}</p>
                    {result.transactionReference && (
                      <p className="text-xs font-mono font-medium text-emerald-800 mt-1">
                        Ref: {result.transactionReference}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => router.push(`/customer/orders/${order.id}`)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-4 font-semibold"
                  >
                    View Verified Order &rarr;
                  </Button>
                </>
              ) : (
                <>
                  <span className="font-bold text-sm uppercase px-2.5 py-1 rounded-full bg-red-100 text-red-800 inline-block">
                    ✕ FAILED
                  </span>
                  <div>
                    <h3 className="font-bold text-base text-red-900">Payment Simulation Failed</h3>
                    <p className="text-xs text-red-700 mt-1">{result.message}</p>
                    <p className="text-[11px] text-red-600 mt-0.5">
                      The order has been transitioned to CANCELLED. Your cart items have been
                      preserved for retry.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => router.push('/customer/cart')}
                      className="text-xs h-9 px-3 border-red-300 text-red-800"
                    >
                      Return to Cart
                    </Button>
                    <Button
                      onClick={() => router.push(`/customer/orders/${order.id}`)}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs h-9 px-4"
                    >
                      View Order Details
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <span className="text-xs font-semibold text-slate-700 block text-center">
                Select outcome to simulate:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  onClick={() => handleSimulate('SUCCESS')}
                  disabled={processing}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-xs font-bold shadow-xs flex items-center justify-center"
                >
                  Simulate SUCCESS
                </Button>

                <Button
                  onClick={() => handleSimulate('FAILURE')}
                  disabled={processing}
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50 h-12 text-xs font-bold shadow-xs flex items-center justify-center"
                >
                  Simulate FAILURE
                </Button>
              </div>

              <p className="text-[11px] text-slate-400 text-center leading-normal">
                SUCCESS sets payment status to SUCCESS and keeps order in PENDING_VERIFICATION for
                pharmacist review. FAILURE cancels the order and keeps your cart intact for retry.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
