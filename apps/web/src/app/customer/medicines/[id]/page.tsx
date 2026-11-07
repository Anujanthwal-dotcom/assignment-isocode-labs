'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api/client';
import { CustomerMedicineDTO } from '@pharmacy/shared-types';

export default function CustomerMedicineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const medicineId = params.id as string;

  const [medicine, setMedicine] = React.useState<CustomerMedicineDTO | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [quantity, setQuantity] = React.useState<number>(1);
  const [adding, setAdding] = React.useState(false);
  const [added, setAdded] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;
    const fetchMedicine = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<CustomerMedicineDTO>(`/customer/medicines/${medicineId}`);
        if (isMounted) setMedicine(res);
      } catch (err: unknown) {
        if (isMounted) setError((err as Error).message || 'Medicine not found or inactive.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMedicine();
    return () => {
      isMounted = false;
    };
  }, [medicineId]);

  const handleAddToCart = async () => {
    if (!medicine) return;
    setAdding(true);
    try {
      await apiFetch('/customer/cart/items', {
        method: 'POST',
        body: JSON.stringify({ medicineId: medicine.id, quantity }),
      });
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to add to cart.');
    } finally {
      setAdding(false);
    }
  };

  const getScheduleNotice = (schedule: string) => {
    if (schedule === 'OTC') {
      return (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-start gap-2">
          <span className="font-bold text-[11px] uppercase px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900">
            OTC
          </span>
          <div>
            <strong className="block">Over-The-Counter (OTC)</strong>
            This item is classified as OTC in the medicine catalogue. Note that all customer orders
            undergo review by a registered pharmacist before processing.
          </div>
        </div>
      );
    }
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-start gap-2">
        <span className="font-bold text-[11px] uppercase px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
          RX REQ
        </span>
        <div>
          <strong className="block">Prescription Required ({schedule.replace(/_/g, ' ')})</strong>
          Under Indian Drugs and Cosmetics Rules, this medicine requires a valid prescription
          written by a registered medical practitioner. You will be prompted to upload or select a
          prescription during checkout.
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-[750px] mx-auto py-12 text-center text-xs text-slate-500">
        Loading medicine details...
      </div>
    );
  }

  if (error || !medicine) {
    return (
      <div className="max-w-[750px] mx-auto py-8">
        <Card className="p-8 text-center border-red-200 bg-red-50">
          <span className="text-xs uppercase font-bold text-red-600 block mb-1">Notice</span>
          <h2 className="text-base font-semibold text-red-800">Medicine Unavailable</h2>
          <p className="text-xs text-red-600 mt-1">
            {error || 'This medicine is inactive or was not found.'}
          </p>
          <Button
            size="sm"
            onClick={() => router.push('/customer/medicines')}
            className="mt-4 text-xs"
          >
            Back to Catalogue
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-[800px] mx-auto space-y-6">
      {/* Back button */}
      <div>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-xs font-semibold text-[#6240E8] hover:underline"
        >
          &larr; Back to Catalogue
        </button>
      </div>

      <Card className="border-[#EAE8F0] bg-white shadow-xs">
        <CardContent className="p-6 md:p-8 space-y-6">
          {/* Header & Badges */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">
                SKU: {medicine.sku}
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-[#351F65]">{medicine.name}</h1>
              {medicine.genericName && (
                <p className="text-sm text-slate-600 mt-1">
                  Salt Composition:{' '}
                  <span className="font-semibold text-slate-900">{medicine.genericName}</span>
                </p>
              )}
            </div>
            <div className="self-start sm:self-auto">
              <Badge variant="purple" className="text-xs font-semibold px-2.5 py-1">
                {medicine.schedule.replace(/_/g, ' ')}
              </Badge>
            </div>
          </div>

          {/* Pricing & Cart Action Box */}
          <div className="p-5 rounded-xl bg-[#F8F9FB] border border-[#EAE8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-400 font-medium uppercase block">
                Maximum Retail Price
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-3xl font-extrabold text-[#351F65]">
                  ₹{medicine.mrp.toFixed(2)}
                </span>
                <span className="text-xs text-slate-500 font-medium">inclusive of all taxes</span>
              </div>
            </div>

            {/* Quantity Stepper & Add Button */}
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-slate-300 rounded-lg bg-white h-10 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 text-sm font-bold text-slate-600 hover:text-slate-900 disabled:opacity-40"
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <span className="px-3 text-sm font-semibold text-slate-900 select-none">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(100, q + 1))}
                  className="px-3 text-sm font-bold text-slate-600 hover:text-slate-900 disabled:opacity-40"
                  disabled={quantity >= 100}
                >
                  +
                </button>
              </div>

              <Button
                onClick={handleAddToCart}
                disabled={adding}
                className="h-10 px-5 bg-[#6240E8] text-white hover:bg-[#5233D0] shadow-xs text-sm font-semibold"
              >
                {added ? '✓ Added to Cart' : '+ Add to Cart'}
              </Button>
            </div>
          </div>

          {/* Specifications Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block uppercase font-medium">Dosage Form</span>
              <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                {medicine.dosageForm || 'Unit'}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block uppercase font-medium">Strength</span>
              <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                {medicine.strength || 'Standard'}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block uppercase font-medium">Pack Size</span>
              <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                {medicine.packSize || '1 pack'}
              </span>
            </div>
            {medicine.brandName && (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block uppercase font-medium">Brand</span>
                <span className="font-semibold text-slate-800 text-sm mt-0.5 block truncate">
                  {medicine.brandName}
                </span>
              </div>
            )}
            {medicine.manufacturer && (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 sm:col-span-2">
                <span className="text-slate-400 block uppercase font-medium">Manufacturer</span>
                <span className="font-semibold text-slate-800 text-sm mt-0.5 block truncate">
                  {medicine.manufacturer}
                </span>
              </div>
            )}
          </div>

          {/* Schedule Notice */}
          {getScheduleNotice(medicine.schedule)}
        </CardContent>
      </Card>
    </div>
  );
}
