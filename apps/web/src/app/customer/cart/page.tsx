'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api/client';
import { CartDTO } from '@pharmacy/shared-types';

export default function CustomerCartPage() {
  const router = useRouter();
  const [cart, setCart] = React.useState<CartDTO | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<CartDTO>('/customer/cart');
      setCart(res);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load shopping cart.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchCart();
  }, []);

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1 || newQuantity > 100) return;
    setUpdatingId(itemId);
    try {
      const updated = await apiFetch<CartDTO>(`/customer/cart/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity: newQuantity }),
      });
      setCart(updated);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to update quantity.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    setUpdatingId(itemId);
    try {
      const updated = await apiFetch<CartDTO>(`/customer/cart/items/${itemId}`, {
        method: 'DELETE',
      });
      setCart(updated);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to remove item.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleClearCart = async () => {
    if (!confirm('Are you sure you want to empty your entire cart?')) return;
    try {
      const emptyCart = await apiFetch<CartDTO>('/customer/cart', {
        method: 'DELETE',
      });
      setCart(emptyCart);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to clear cart.');
    }
  };

  return (
    <div className="max-w-[950px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#EBECEF]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Shopping Cart</h1>
          <p className="text-sm text-[#78879A] mt-1">
            Review your selected medicines before prescription verification and checkout.
          </p>
        </div>
        {cart && cart.items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearCart}
            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 self-start sm:self-auto"
          >
            Clear Cart
          </Button>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">Loading your cart...</div>
      ) : error ? (
        <Card className="p-8 border-red-200 bg-red-50 text-center">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </Card>
      ) : !cart || cart.items.length === 0 ? (
        <Card className="p-12 border-[#EBECEF] bg-white text-center">
          <h3 className="text-base font-semibold text-slate-800">Your Cart is Empty</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            You don&apos;t have any medicines in your cart yet. Browse our catalogue to select
            required medications.
          </p>
          <Button
            size="sm"
            onClick={() => router.push('/customer/medicines')}
            className="mt-4 text-xs bg-[#0D5C5A] text-white hover:bg-[#0A4846]"
          >
            Browse Medicines
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cart Items List (Col 8) */}
          <div className="lg:col-span-8 space-y-3">
            {cart.hasInactiveItems && (
              <div className="rounded-xl border border-red-300 bg-red-50 p-4 flex items-start gap-3">
                <span className="font-bold text-[11px] uppercase px-1.5 py-0.5 rounded bg-red-200 text-red-900">
                  ALERT
                </span>
                <div className="text-xs text-red-800 leading-relaxed">
                  <strong className="block font-semibold">Inactive Medicines in Cart</strong>
                  One or more items in your cart are no longer active in our pharmacy catalogue. You
                  must remove them before proceeding to checkout.
                </div>
              </div>
            )}

            {cart.items.map((item) => {
              const isInactive = item.medicine.status !== 'ACTIVE';
              return (
                <Card
                  key={item.id}
                  className={`border transition-all p-4 ${
                    isInactive ? 'border-red-300 bg-red-50/50' : 'border-[#EBECEF] bg-white'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/customer/medicines/${item.medicine.id}`}
                          className="font-bold text-sm text-[#0F172A] hover:text-[#0D5C5A]"
                        >
                          {item.medicine.name}
                        </Link>
                        {isInactive && (
                          <Badge variant="danger" className="text-[10px]">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        SKU: <span className="font-mono">{item.medicine.sku}</span> &bull;{' '}
                        {item.medicine.dosageForm || 'Unit'} &bull;{' '}
                        {item.medicine.packSize || '1 pack'}
                      </p>
                      <p className="text-xs font-semibold text-slate-700">
                        MRP: ₹{item.unitPrice.toFixed(2)} each
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                      {/* Stepper */}
                      <div className="flex items-center border border-slate-300 rounded-lg bg-white h-9">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1 || updatingId === item.id}
                          className="px-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 disabled:opacity-30"
                        >
                          -
                        </button>
                        <span className="px-2 text-xs font-semibold text-slate-900 select-none min-w-[24px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= 100 || updatingId === item.id}
                          className="px-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>

                      {/* Line Total */}
                      <span className="font-bold text-base text-[#0F172A] min-w-[70px] text-right">
                        ₹{item.lineTotal.toFixed(2)}
                      </span>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={updatingId === item.id}
                        className="text-xs text-slate-400 hover:text-red-600 font-semibold px-2 py-1 rounded transition-colors"
                        title="Remove item"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}

            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/customer/medicines')}
                className="text-xs text-slate-600 border-slate-300"
              >
                &larr; Continue Shopping
              </Button>
            </div>
          </div>

          {/* Cart Summary (Col 4) */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="border-[#EBECEF] bg-white p-5 space-y-4">
              <CardTitle className="text-base font-bold text-[#0F172A]">Order Summary</CardTitle>

              <div className="space-y-2 text-xs text-slate-600 border-b border-slate-100 pb-3">
                <div className="flex justify-between">
                  <span>Total Items:</span>
                  <span className="font-semibold text-slate-900">{cart.itemCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cart Subtotal:</span>
                  <span className="font-semibold text-slate-900">₹{cart.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Delivery Fee:</span>
                  <span className="font-semibold">₹0.00 (Standard)</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Discount:</span>
                  <span>₹0.00</span>
                </div>
              </div>

              <div className="flex justify-between items-baseline pt-1">
                <span className="font-bold text-sm text-[#0F172A]">Total Amount</span>
                <span className="font-extrabold text-2xl text-[#0D5C5A]">
                  ₹{cart.subtotal.toFixed(2)}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg text-[11px] text-slate-500 leading-normal border border-slate-100">
                A valid prescription is required at checkout for Schedule H and H1 medications.
              </div>

              <Button
                onClick={() => router.push('/customer/checkout')}
                disabled={cart.items.length === 0 || cart.hasInactiveItems}
                className="w-full bg-[#0D5C5A] text-white hover:bg-[#0A4846] h-11 text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5"
              >
                <span>Proceed to Checkout</span>
                <span>&rarr;</span>
              </Button>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
