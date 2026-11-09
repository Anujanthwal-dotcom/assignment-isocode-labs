'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api/client';
import { CustomerMedicineDTO } from '@pharmacy/shared-types';

export default function CustomerMedicinesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [search, setSearch] = React.useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = React.useState(initialSearch);
  const [medicines, setMedicines] = React.useState<CustomerMedicineDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);
  const [addingId, setAddingId] = React.useState<string | null>(null);
  const [addedId, setAddedId] = React.useState<string | null>(null);

  // Debounce search input (350ms)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch medicines
  React.useEffect(() => {
    let isMounted = true;
    const fetchCatalogue = async () => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams({
          page: String(page),
          limit: '12',
        });
        if (debouncedSearch.trim()) {
          queryParams.set('search', debouncedSearch.trim());
        }

        const res = await apiFetch<{
          data: CustomerMedicineDTO[];
          meta: { total: number; page: number; limit: number; totalPages: number };
        }>(`/customer/medicines?${queryParams.toString()}`);

        if (isMounted && res) {
          setMedicines(res.data || []);
          setTotalCount(res.meta?.total || 0);
          setTotalPages(res.meta?.totalPages || 1);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError((err as Error).message || 'Failed to load medicines.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchCatalogue();
    return () => {
      isMounted = false;
    };
  }, [debouncedSearch, page]);

  const handleAddToCart = async (medicineId: string) => {
    setAddingId(medicineId);
    try {
      await apiFetch('/customer/cart/items', {
        method: 'POST',
        body: JSON.stringify({ medicineId, quantity: 1 }),
      });
      setAddedId(medicineId);
      setTimeout(() => setAddedId(null), 1500);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to add item to cart');
    } finally {
      setAddingId(null);
    }
  };

  const getScheduleBadge = (schedule: string) => {
    switch (schedule) {
      case 'SCHEDULE_H':
        return <Badge variant="warning">Schedule H (Rx)</Badge>;
      case 'SCHEDULE_H1':
        return <Badge variant="danger">Schedule H1 (Rx)</Badge>;
      case 'SCHEDULE_X':
      case 'NARCOTIC':
        return <Badge variant="danger">{schedule} (Strict Rx)</Badge>;
      case 'OTC':
        return <Badge variant="success">OTC</Badge>;
      default:
        return <Badge variant="neutral">{schedule}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-[1100px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#EBECEF]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Medicine Catalogue</h1>
          <p className="text-xs text-slate-500 mt-1">
            Over-the-counter (OTC) medicines available for direct order.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => router.push('/customer/prescriptions')}
          className="text-xs bg-[#0D5C5A] text-white hover:bg-[#0A4846]"
        >
          Upload Prescription &rarr;
        </Button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search OTC medicines by name, brand, generic salt, or SKU..."
          className="h-11 px-4 pr-16 rounded-xl border-[#EBECEF] bg-white text-sm shadow-xs focus:ring-2 focus:ring-[#0D5C5A]"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-3 text-xs text-slate-400 hover:text-slate-600 uppercase font-semibold"
          >
            Clear
          </button>
        )}
      </div>

      {/* Catalogue Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-48 rounded-xl bg-slate-100 animate-pulse border border-slate-200"
            />
          ))}
        </div>
      ) : error ? (
        <Card className="p-8 border-red-200 bg-red-50 text-center">
          <p className="text-xs uppercase font-bold text-red-600 mb-1">Notice</p>
          <p className="text-sm text-red-700 font-medium">{error}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage(1)}
            className="mt-3 text-xs border-red-300 text-red-700"
          >
            Retry
          </Button>
        </Card>
      ) : medicines.length === 0 ? (
        <Card className="p-12 border-[#EBECEF] bg-white text-center">
          <h3 className="text-base font-semibold text-slate-800">No OTC Medicines Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            We couldn&apos;t find any active OTC medicines matching &quot;{debouncedSearch}&quot;. Try
            searching for another brand or generic name.
          </p>
          {debouncedSearch && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSearch('')}
              className="mt-4 text-xs"
            >
              Clear Search
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {medicines.map((med) => (
            <Card
              key={med.id}
              className="border-[#EBECEF] bg-white hover:border-[#0D5C5A]/40 hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <Link
                      href={`/customer/medicines/${med.id}`}
                      className="font-bold text-base text-[#0F172A] hover:text-[#0D5C5A] transition-colors line-clamp-1"
                    >
                      {med.name}
                    </Link>
                    {med.genericName && (
                      <p className="text-xs text-slate-500 line-clamp-1">
                        Salt: <span className="font-medium text-slate-700">{med.genericName}</span>
                      </p>
                    )}
                  </div>
                  {getScheduleBadge(med.schedule)}
                </div>

                <div className="text-xs text-slate-500 space-y-1 pt-1 border-t border-slate-100">
                  <div className="flex justify-between">
                    <span>Dosage &amp; Pack:</span>
                    <span className="font-medium text-slate-800">
                      {med.dosageForm || 'Unit'} &bull; {med.packSize || '1 pack'}
                    </span>
                  </div>
                  {med.manufacturer && (
                    <div className="flex justify-between">
                      <span>Manufacturer:</span>
                      <span className="font-medium text-slate-800 truncate max-w-[150px]">
                        {med.manufacturer}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>SKU:</span>
                    <span className="font-mono text-slate-600">{med.sku}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div>
                    <span className="text-[11px] text-slate-400 block uppercase font-semibold">
                      MRP
                    </span>
                    <span className="text-lg font-extrabold text-[#0F172A]">
                      ₹{med.mrp.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/customer/medicines/${med.id}`)}
                      className="text-xs h-8 px-2.5 text-slate-600 border-slate-200"
                    >
                      Details
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAddToCart(med.id)}
                      disabled={addingId === med.id}
                      className="text-xs h-8 px-3 bg-[#0D5C5A] text-white hover:bg-[#0A4846]"
                    >
                      {addedId === med.id ? '✓ Added' : '+ Add'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-[#EBECEF]">
          <span className="text-xs text-slate-500">
            Page {page} of {totalPages} ({totalCount} total medicines)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="text-xs h-8 px-3"
            >
              &larr; Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              className="text-xs h-8 px-3"
            >
              Next &rarr;
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
