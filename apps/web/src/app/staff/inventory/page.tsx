'use client';

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { StaffShell } from '@/components/staff/StaffShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api/client';
import {
  Boxes,
  Search,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';

interface InventoryItem {
  id: string;
  medicineId: string;
  sku: string;
  name: string;
  genericName?: string;
  brandName?: string;
  strength?: string;
  dosageForm?: string;
  quantityOnHand: number;
  reorderLevel: number;
  activeReservations: number;
  availableStock: number;
}

export default function StaffInventoryPage() {
  const { user } = useAuth();
  const [items, setItems] = React.useState<InventoryItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');

  const store = user?.store;
  const storeId = store?.id;

  const loadBalances = React.useCallback(async () => {
    if (!storeId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<{ data: any[] }>(
        `/inventory/balances?locationType=STORE&locationId=${storeId}`,
      );

      const mapped: InventoryItem[] = (res.data || []).map((b) => {
        const med = b.medicine || {};
        const onHand = Number(b.quantityOnHand) || 0;
        const reorder = Number(b.reorderLevel) || 0;
        const reserved = Number(b.reservedQuantity || b.activeReservations) || 0;
        const available = Math.max(0, onHand - reserved);

        return {
          id: b.id,
          medicineId: b.medicineId,
          sku: med.sku || b.sku || 'SKU-UNKNOWN',
          name: med.name || 'Medicine',
          genericName: med.genericName,
          brandName: med.brandName,
          strength: med.strength,
          dosageForm: med.dosageForm,
          quantityOnHand: onHand,
          reorderLevel: reorder,
          activeReservations: reserved,
          availableStock: available,
        };
      });

      setItems(mapped);
    } catch (err: any) {
      setError(err?.message || 'Failed to load store inventory.');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  React.useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  const filteredItems = React.useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q) ||
        (i.genericName && i.genericName.toLowerCase().includes(q)) ||
        (i.brandName && i.brandName.toLowerCase().includes(q)),
    );
  }, [items, search]);

  return (
    <StaffShell pageContext="Store Inventory Balances">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-amber-200/60">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Live Store Inventory
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold border border-amber-200">
                {store?.name || 'Store'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Real-time on-hand stock and active reservations for this store.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadBalances}
              disabled={loading}
              className="border-slate-300 text-slate-700 h-9 text-xs font-semibold gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>

            <Link
              href="/staff/inventory/import"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 shadow-2xs transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Inject Daily CSV</span>
            </Link>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <Input
              type="text"
              placeholder="Filter by medicine name, brand, or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="text-xs text-slate-500 font-mono">
            Showing {filteredItems.length} of {items.length} SKUs
          </div>
        </div>

        {/* Error notice */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
            {error}
          </div>
        )}

        {/* Balances Table */}
        <Card className="border-slate-200 bg-white shadow-2xs overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400">Loading store stock balances...</div>
            ) : filteredItems.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Boxes className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">No inventory balances found.</p>
                <Link
                  href="/staff/inventory/import"
                  className="text-xs font-bold text-amber-800 hover:underline"
                >
                  Upload your first store CSV &rarr;
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="py-3 px-4">Medicine Name &amp; SKU</th>
                      <th className="py-3 px-4">Dosage / Strength</th>
                      <th className="py-3 px-4 text-right">Physical On Hand</th>
                      <th className="py-3 px-4 text-right">Active Reservations</th>
                      <th className="py-3 px-4 text-right">Net Available</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((item) => {
                      const isLowStock = item.availableStock <= item.reorderLevel;
                      const isOutOfStock = item.availableStock <= 0;

                      return (
                        <tr key={item.id} className="hover:bg-amber-50/30 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block text-xs">
                              {item.name}
                            </span>
                            <span className="font-mono text-[11px] text-slate-400">
                              {item.sku} {item.brandName ? `• ${item.brandName}` : ''}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {item.dosageForm || 'Tablet'}{' '}
                            {item.strength ? `(${item.strength})` : ''}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                            {item.quantityOnHand}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-500">
                            {item.activeReservations}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-sm text-slate-900">
                            {item.availableStock}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isOutOfStock ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Out of Stock
                              </span>
                            ) : isLowStock ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Low Stock
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                In Stock
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StaffShell>
  );
}
