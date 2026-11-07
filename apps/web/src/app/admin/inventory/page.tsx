'use client';

import * as React from 'react';

import { apiFetch, ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { SemanticAlert } from '@/components/shared/SemanticAlert';
import type {
  InventoryBalanceDTO,
  InventorySummaryDTO,
  InventoryMovementDTO,
} from '@pharmacy/shared-types';

interface StoreOption {
  id: string;
  code: string;
  name: string;
  city: string;
}

interface WarehouseOption {
  id: string;
  code: string;
  name: string;
  city: string;
}

export default function AdminInventoryPage() {
  const [summary, setSummary] = React.useState<InventorySummaryDTO | null>(null);
  const [balances, setBalances] = React.useState<InventoryBalanceDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Locations
  const [stores, setStores] = React.useState<StoreOption[]>([]);
  const [warehouses, setWarehouses] = React.useState<WarehouseOption[]>([]);

  // Filters
  const [selectedLocation, setSelectedLocation] = React.useState<string>('ALL'); // 'ALL' | 'STORE:id' | 'WAREHOUSE:id'
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [total, setTotal] = React.useState(0);

  // Stock Adjustment Modal
  const [adjustingBalance, setAdjustingBalance] = React.useState<InventoryBalanceDTO | null>(null);
  const [adjustQuantity, setAdjustQuantity] = React.useState<string>('');
  const [adjustReason, setAdjustReason] = React.useState<string>('');
  const [adjustSubmitting, setAdjustSubmitting] = React.useState(false);
  const [adjustError, setAdjustError] = React.useState<string | null>(null);
  const [adjustSuccess, setAdjustSuccess] = React.useState<string | null>(null);

  // Movement History Modal
  const [historyBalance, setHistoryBalance] = React.useState<InventoryBalanceDTO | null>(null);
  const [movements, setMovements] = React.useState<InventoryMovementDTO[]>([]);
  const [loadingMovements, setLoadingMovements] = React.useState(false);

  // Load Locations once
  React.useEffect(() => {
    async function loadLocations() {
      try {
        const [storesData, warehousesData] = await Promise.all([
          apiFetch<StoreOption[]>('/stores').catch(() => []),
          apiFetch<WarehouseOption[]>('/warehouses').catch(() => []),
        ]);
        setStores(storesData);
        setWarehouses(warehousesData);
      } catch {
        // Ignored
      }
    }
    loadLocations();
  }, []);

  // Fetch Inventory Summary & Balances
  const fetchInventory = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const summaryPromise = apiFetch<InventorySummaryDTO>('/inventory/summary');

      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '10');
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'ALL') params.set('stockStatus', statusFilter);

      if (selectedLocation.startsWith('STORE:')) {
        params.set('storeId', selectedLocation.replace('STORE:', ''));
      } else if (selectedLocation.startsWith('WAREHOUSE:')) {
        params.set('warehouseId', selectedLocation.replace('WAREHOUSE:', ''));
      }

      const [summaryRes, balancesRes] = await Promise.all([
        summaryPromise,
        apiFetch<{
          data: InventoryBalanceDTO[];
          pagination: { page: number; limit: number; total: number; totalPages: number };
        }>(`/inventory?${params.toString()}`),
      ]);

      setSummary(summaryRes);
      setBalances(balancesRes.data);
      setTotalPages(balancesRes.pagination.totalPages);
      setTotal(balancesRes.pagination.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to fetch inventory stock.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, selectedLocation]);

  React.useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Handle open adjust modal
  const handleOpenAdjust = (balance: InventoryBalanceDTO) => {
    setAdjustingBalance(balance);
    setAdjustQuantity('');
    setAdjustReason('');
    setAdjustError(null);
    setAdjustSuccess(null);
  };

  // Live resulting calculation
  const parsedChange = parseInt(adjustQuantity, 10);
  const isValidNumber = !isNaN(parsedChange) && parsedChange !== 0;
  const resultingStock =
    adjustingBalance && isValidNumber ? adjustingBalance.quantity + parsedChange : null;
  const isNegativeResult = resultingStock !== null && resultingStock < 0;

  // Submit Adjustment
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingBalance || !isValidNumber) return;

    if (!adjustReason.trim()) {
      setAdjustError('A clear adjustment reason is mandatory.');
      return;
    }

    if (isNegativeResult) {
      setAdjustError('The adjustment would result in negative inventory.');
      return;
    }

    setAdjustSubmitting(true);
    setAdjustError(null);

    try {
      await apiFetch('/inventory/adjustments', {
        method: 'POST',
        body: JSON.stringify({
          medicineId: adjustingBalance.medicineId,
          locationType:
            adjustingBalance.location?.type || (adjustingBalance.storeId ? 'STORE' : 'WAREHOUSE'),
          locationId: adjustingBalance.storeId || adjustingBalance.warehouseId,
          quantityChange: parsedChange,
          reason: adjustReason.trim(),
        }),
      });

      setAdjustSuccess('Stock adjustment applied successfully!');
      setTimeout(() => {
        setAdjustingBalance(null);
        fetchInventory();
      }, 900);
    } catch (err) {
      setAdjustError(err instanceof ApiError ? err.message : 'Adjustment failed.');
    } finally {
      setAdjustSubmitting(false);
    }
  };

  // Open Movement History
  const handleOpenHistory = async (balance: InventoryBalanceDTO) => {
    setHistoryBalance(balance);
    setLoadingMovements(true);
    try {
      const params = new URLSearchParams();
      params.set('medicineId', balance.medicineId);
      if (balance.storeId) params.set('storeId', balance.storeId);
      if (balance.warehouseId) params.set('warehouseId', balance.warehouseId);
      params.set('limit', '50');

      const res = await apiFetch<{ data: InventoryMovementDTO[] }>(
        `/inventory/movements?${params.toString()}`,
      );
      setMovements(res.data);
    } catch {
      setMovements([]);
    } finally {
      setLoadingMovements(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[24px] font-bold tracking-tight text-[#0F172A]">Chain Inventory</h1>
        <p className="text-[14px] text-[#78879A]">
          Track physical inventory quantities, reorder thresholds, and historical stock movements
          across all 46 stores and the Kolkata central warehouse.
        </p>
      </div>

      {error && <SemanticAlert type="error" title="Inventory Error" description={error} />}

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-[12px] border border-[#EBECEF] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#78879A] text-[12px] font-medium">
            <span>Total Units Stocked</span>
            <span className="font-bold text-[#0D5C5A]">[Stock]</span>
          </div>
          <div className="mt-2 text-[26px] font-bold text-[#0F172A]">
            {summary ? summary.totalStockUnits.toLocaleString('en-IN') : '—'}
          </div>
          <p className="text-[11px] text-[#78879A] mt-1">Units recorded across locations</p>
        </div>

        <div className="rounded-[12px] border border-[#F6DCB0] bg-[#FFF8EC] p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#A66B16] text-[12px] font-medium">
            <span>Low-Stock Lines</span>
            <span className="font-bold text-[#A66B16]">[!]</span>
          </div>
          <div className="mt-2 text-[26px] font-bold text-[#A66B16]">
            {summary ? summary.lowStockCount : '—'}
          </div>
          <p className="text-[11px] text-[#A66B16]/80 mt-1">Quantity ≤ Reorder Level</p>
        </div>

        <div className="rounded-[12px] border border-[#F9CACA] bg-[#FDF2F2] p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#DC3545] text-[12px] font-medium">
            <span>Out of Stock</span>
            <span className="font-bold text-[#DC3545]">[Empty]</span>
          </div>
          <div className="mt-2 text-[26px] font-bold text-[#DC3545]">
            {summary ? summary.outOfStockCount : '—'}
          </div>
          <p className="text-[11px] text-[#DC3545]/80 mt-1">Quantity is exactly 0</p>
        </div>

        <div className="rounded-[12px] border border-[#EBECEF] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#78879A] text-[12px] font-medium">
            <span>Inventory Records</span>
            <span className="font-bold text-[#0088AA]">[Records]</span>
          </div>
          <div className="mt-2 text-[26px] font-bold text-[#0F172A]">
            {summary ? summary.totalInventoryBalances : '—'}
          </div>
          <p className="text-[11px] text-[#78879A] mt-1">Active medicine-location balances</p>
        </div>
      </div>

      {/* Filter and Location Selector Toolbar */}
      <div className="rounded-[12px] border border-[#EBECEF] bg-white p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 min-w-[220px]">
          <Input
            placeholder="Search medicine name or SKU..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="bg-[#F8F9FB] border-[#EBECEF]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Location Selector */}
          <div className="flex items-center gap-1.5 text-[13px] text-[#6C757D]">
            <span>Location:</span>
          </div>
          <select
            value={selectedLocation}
            onChange={(e) => {
              setSelectedLocation(e.target.value);
              setPage(1);
            }}
            className="h-[38px] rounded-[6px] border border-[#CED4DA] bg-white px-2.5 text-[13px] text-[#14161A] focus:outline-none focus:border-[#0D5C5A]"
          >
            <option value="ALL">All Chain Locations</option>
            <optgroup label="Central Warehouse">
              {warehouses.map((w) => (
                <option key={w.id} value={`WAREHOUSE:${w.id}`}>
                  {w.name} ({w.code})
                </option>
              ))}
            </optgroup>
            <optgroup label="Stores">
              {stores.map((s) => (
                <option key={s.id} value={`STORE:${s.id}`}>
                  {s.name} ({s.code}) - {s.city}
                </option>
              ))}
            </optgroup>
          </select>

          {/* Stock Status Filter */}
          <div className="flex items-center gap-1.5 text-[13px] text-[#6C757D] ml-2">
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-[38px] rounded-[6px] border border-[#CED4DA] bg-white px-2.5 text-[13px] text-[#14161A] focus:outline-none focus:border-[#0D5C5A]"
          >
            <option value="ALL">All Stock Statuses</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Inventory Stock Table */}
      <div className="rounded-[12px] border border-[#EBECEF] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#EBECEF] bg-[#F8F9FB] text-[#78879A] font-semibold">
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Medicine Name</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-right">Current Stock</th>
                <th className="py-3 px-4 text-right">Reorder Threshold</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Last Updated</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBECEF]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#78879A]">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#0D5C5A] border-t-transparent rounded-full animate-spin" />
                      <span>Loading inventory stock...</span>
                    </div>
                  </td>
                </tr>
              ) : balances.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#78879A]">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <p className="font-semibold text-[#0F172A]">No inventory records found</p>
                      <p className="text-[12px]">
                        No balances match your selected filters or locations.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                balances.map((item) => {
                  return (
                    <tr key={item.id} className="hover:bg-[#F8F9FB]/60 transition-colors">
                      <td className="py-3 px-4 font-mono text-[12px] font-medium text-[#0F172A]">
                        {item.medicine?.sku}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#14161A]">{item.medicine?.name}</div>
                        {item.medicine?.genericName && (
                          <div className="text-[11px] text-[#78879A]">
                            {item.medicine?.genericName}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#14161A]">
                          <span>{item.location?.name}</span>
                        </div>
                        <span className="text-[11px] text-[#78879A] block font-mono">
                          {item.location?.code} • {item.location?.city}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#14161A]">
                        {item.quantity.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right text-[#6C757D]">{item.reorderLevel}</td>
                      <td className="py-3 px-4 text-center">
                        {item.stockStatus === 'IN_STOCK' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#E8F8EC] text-[#0FAC26] border border-[#B0E6BC]">
                            In Stock
                          </span>
                        )}
                        {item.stockStatus === 'LOW_STOCK' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#FFF8EC] text-[#A66B16] border border-[#F6DCB0]">
                            Low Stock
                          </span>
                        )}
                        {item.stockStatus === 'OUT_OF_STOCK' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#FDF2F2] text-[#DC3545] border border-[#F9CACA]">
                            Out of Stock
                          </span>
                        )}
                        {item.stockStatus === 'UNKNOWN' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#EFF2F7] text-[#6C757D] border border-[#CED4DA]">
                            Unknown
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#78879A] text-[12px]">
                        {new Date(item.updatedAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenHistory(item)}
                            className="px-2 py-0.5 rounded text-xs font-semibold text-[#0088AA] hover:bg-[#EBF9FD]"
                            title="Movement History"
                          >
                            History
                          </button>
                          <button
                            onClick={() => handleOpenAdjust(item)}
                            className="px-2 py-0.5 rounded text-xs font-semibold text-[#0D5C5A] hover:bg-[#F0FDFA]"
                            title="Adjust Stock"
                          >
                            Adjust
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-[#EBECEF] px-4 py-3 text-[13px] text-[#78879A]">
          <div>
            Showing <span className="font-semibold text-[#14161A]">{balances.length}</span> of{' '}
            <span className="font-semibold text-[#14161A]">{total}</span> inventory balances
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 text-[12px]"
            >
              Previous
            </Button>
            <span className="px-2 font-medium text-[#0F172A]">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 text-[12px]"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Stock Adjustment Dialog */}
      <Dialog
        open={Boolean(adjustingBalance)}
        onOpenChange={(open) => !open && setAdjustingBalance(null)}
      >
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-[#0F172A] text-[18px]">Adjust Inventory Stock</DialogTitle>
          </DialogHeader>

          {adjustingBalance && (
            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div className="rounded-[8px] bg-[#F8F9FB] p-3 border border-[#EBECEF] text-[13px]">
                <div className="font-semibold text-[#0F172A]">
                  {adjustingBalance.medicine?.name}
                </div>
                <div className="text-[11px] font-mono text-[#78879A]">
                  SKU: {adjustingBalance.medicine?.sku} • Location:{' '}
                  {adjustingBalance.location?.name} ({adjustingBalance.location?.code})
                </div>
                <div className="mt-2 text-[12px] font-medium text-[#14161A]">
                  Current Stock:{' '}
                  <span className="font-bold text-[#0D5C5A]">{adjustingBalance.quantity}</span>{' '}
                  units
                </div>
              </div>

              {adjustError && (
                <SemanticAlert type="error" title="Adjustment Denied" description={adjustError} />
              )}

              {adjustSuccess && (
                <SemanticAlert type="success" title="Success" description={adjustSuccess} />
              )}

              <div>
                <label className="block text-[12px] font-semibold text-[#0F172A] mb-1">
                  Adjustment Quantity (+ / -) <span className="text-[#DC3545]">*</span>
                </label>
                <Input
                  required
                  type="number"
                  placeholder="e.g. +10 to add, -5 to deduct"
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(e.target.value)}
                  className="font-mono text-[14px]"
                />
                <p className="text-[11px] text-[#78879A] mt-1">
                  Enter a positive integer to increment stock, or negative to deduct. Cannot be
                  zero.
                </p>
              </div>

              {/* Live Preview Card */}
              {isValidNumber && resultingStock !== null && (
                <div
                  className={`rounded-[8px] p-3 border text-[13px] ${
                    isNegativeResult
                      ? 'border-[#F9CACA] bg-[#FDF2F2] text-[#DC3545]'
                      : 'border-[#B0E6BC] bg-[#E8F8EC] text-[#0FAC26]'
                  }`}
                >
                  <div className="flex items-center justify-between font-medium">
                    <span>Resulting Stock Preview:</span>
                    <span className="font-bold text-[15px]">
                      {adjustingBalance.quantity}{' '}
                      {parsedChange >= 0 ? `+ ${parsedChange}` : `- ${Math.abs(parsedChange)}`} ={' '}
                      {resultingStock} units
                    </span>
                  </div>
                  {isNegativeResult && (
                    <p className="text-[11px] mt-1 text-[#DC3545] font-semibold">
                      Invalid: Resulting stock cannot be less than zero.
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-[12px] font-semibold text-[#0F172A] mb-1">
                  Reason for Adjustment <span className="text-[#DC3545]">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Damaged during unboxing, Physical stock audit correction"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAdjustingBalance(null)}
                  disabled={adjustSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={adjustSubmitting || !isValidNumber || isNegativeResult}
                  className="bg-[#0D5C5A] hover:bg-[#542F9B] text-white"
                >
                  {adjustSubmitting && (
                    <span className="mr-2 inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  Confirm Adjustment
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Movement History Dialog */}
      <Dialog
        open={Boolean(historyBalance)}
        onOpenChange={(open) => !open && setHistoryBalance(null)}
      >
        <DialogContent className="max-w-[640px]">
          <DialogHeader>
            <DialogTitle className="text-[#0F172A] text-[18px]">
              Stock Movement Audit Trail
            </DialogTitle>
          </DialogHeader>

          {historyBalance && (
            <div className="space-y-4">
              <div className="rounded-[8px] bg-[#F8F9FB] p-3 border border-[#EBECEF] text-[12px]">
                <p className="font-semibold text-[#0F172A]">{historyBalance.medicine?.name}</p>
                <p className="text-[#78879A] font-mono">
                  {historyBalance.medicine?.sku} • {historyBalance.location?.name} (
                  {historyBalance.location?.code})
                </p>
              </div>

              <div className="max-h-[360px] overflow-y-auto border border-[#EBECEF] rounded-[8px]">
                <table className="w-full text-left text-[12px] border-collapse">
                  <thead>
                    <tr className="bg-[#F8F9FB] border-b border-[#EBECEF] text-[#78879A] font-semibold">
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5 text-right">Before</th>
                      <th className="p-2.5 text-right">Change</th>
                      <th className="p-2.5 text-right">After</th>
                      <th className="p-2.5">Reason</th>
                      <th className="p-2.5">Actor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBECEF]">
                    {loadingMovements ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-[#78879A]">
                          <div className="w-4 h-4 border-2 border-[#0D5C5A] border-t-transparent rounded-full animate-spin inline-block mr-2" />
                          Loading movements...
                        </td>
                      </tr>
                    ) : movements.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-[#78879A]">
                          No movements recorded for this balance.
                        </td>
                      </tr>
                    ) : (
                      movements.map((m) => (
                        <tr key={m.id} className="hover:bg-[#F8F9FB]/50">
                          <td className="p-2.5 text-[#78879A] whitespace-nowrap">
                            {new Date(m.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="p-2.5 font-medium text-[#0F172A]">{m.movementType}</td>
                          <td className="p-2.5 text-right text-[#6C757D]">{m.quantityBefore}</td>
                          <td
                            className={`p-2.5 text-right font-bold ${
                              m.quantityChange > 0
                                ? 'text-[#0FAC26]'
                                : m.quantityChange < 0
                                  ? 'text-[#DC3545]'
                                  : 'text-[#78879A]'
                            }`}
                          >
                            {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                          </td>
                          <td className="p-2.5 text-right font-bold text-[#14161A]">
                            {m.quantityAfter}
                          </td>
                          <td
                            className="p-2.5 text-[#6C757D] max-w-[140px] truncate"
                            title={m.reason || ''}
                          >
                            {m.reason || '—'}
                          </td>
                          <td
                            className="p-2.5 text-[#78879A] text-[11px] truncate max-w-[100px]"
                            title={m.actorEmail || ''}
                          >
                            {m.actorEmail || 'System'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setHistoryBalance(null)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
