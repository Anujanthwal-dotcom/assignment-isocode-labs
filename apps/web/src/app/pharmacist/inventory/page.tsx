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
import type { InventoryBalanceDTO, InventoryMovementDTO } from '@pharmacy/shared-types';

export default function PharmacistInventoryPage() {
  const [balances, setBalances] = React.useState<InventoryBalanceDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [total, setTotal] = React.useState(0);

  // Movement History Dialog
  const [historyBalance, setHistoryBalance] = React.useState<InventoryBalanceDTO | null>(null);
  const [movements, setMovements] = React.useState<InventoryMovementDTO[]>([]);
  const [loadingMovements, setLoadingMovements] = React.useState(false);

  // Fetch Inventory (Backend automatically restricts to pharmacist's assigned store)
  const fetchInventory = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '10');
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'ALL') params.set('stockStatus', statusFilter);

      const res = await apiFetch<{
        data: InventoryBalanceDTO[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>(`/inventory?${params.toString()}`);

      setBalances(res.data);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to fetch store inventory.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  React.useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Open Movement History
  const handleOpenHistory = async (balance: InventoryBalanceDTO) => {
    setHistoryBalance(balance);
    setLoadingMovements(true);
    try {
      const params = new URLSearchParams();
      params.set('medicineId', balance.medicineId);
      params.set('limit', '20');

      const res = await apiFetch<{
        data: InventoryMovementDTO[];
      }>(`/inventory/movements?${params.toString()}`);

      setMovements(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to fetch stock movements.');
    } finally {
      setLoadingMovements(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Store Context */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-[#EBF9FD] text-[#0088AA] border border-[#B4EDFB]">
              Salt Lake Store (KOL-001)
            </span>
          </div>
          <h1 className="text-[24px] font-bold text-[#0F172A] tracking-tight">
            Store Stock Inventory
          </h1>
        </div>
      </div>

      {error && <SemanticAlert type="error" title="Inventory Error" description={error} />}

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-[8px] border border-[#EBECEF]">
        <div className="relative w-full sm:w-[320px]">
          <Input
            placeholder="Search medicine name or SKU in store..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-3 h-9 text-[13px]"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 text-[13px] text-[#78879A]">
            <span>Filter:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 rounded-[6px] border border-[#EBECEF] bg-white text-[13px] text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#0D5C5A]"
            >
              <option value="ALL">All Stock Statuses</option>
              <option value="IN_STOCK">In Stock (&gt; 0)</option>
              <option value="LOW_STOCK">Low Stock (&le; Reorder Point)</option>
              <option value="OUT_OF_STOCK">Out of Stock (0)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Inventory Balances Table */}
      <div className="bg-white rounded-[8px] border border-[#EBECEF] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] text-[#0F172A]">
            <thead className="bg-[#F8F9FB] border-b border-[#EBECEF] text-[11px] font-semibold text-[#78879A] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Medicine &amp; SKU</th>
                <th className="py-3 px-4">Dosage / Pack</th>
                <th className="py-3 px-4 text-right">Physical On-Hand</th>
                <th className="py-3 px-4 text-right">Reserved (Active Orders)</th>
                <th className="py-3 px-4 text-right">Available to Dispense</th>
                <th className="py-3 px-4 text-center">Stock Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBECEF]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#78879A]">
                    <span>Loading store inventory...</span>
                  </td>
                </tr>
              ) : balances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#78879A]">
                    No stock records found matching your query.
                  </td>
                </tr>
              ) : (
                balances.map((item) => {
                  const onHand = Number((item as any).onHandQuantity ?? item.quantity ?? 0);
                  const reserved = Number((item as any).reservedQuantity ?? 0);
                  const available = Number((item as any).availableQuantity ?? item.quantity ?? 0);
                  const reorderPoint = Number(
                    (item as any).reorderPoint ?? item.reorderLevel ?? 10,
                  );

                  let statusBadge = (
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#EBF9FD] text-[#0088AA]">
                      In Stock
                    </span>
                  );
                  if (available <= 0) {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#FDEDED] text-[#DC3545]">
                        Out of Stock
                      </span>
                    );
                  } else if (available <= reorderPoint) {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#FFF8EC] text-[#A66B16]">
                        Low Stock ({available}/{reorderPoint})
                      </span>
                    );
                  }

                  return (
                    <tr key={item.id} className="hover:bg-[#F0FDFA]/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#0F172A]">
                          {item.medicine?.name || 'Unnamed Medicine'}
                        </div>
                        <div className="text-[11px] text-[#78879A] font-mono">
                          SKU: {item.medicine?.sku}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#78879A]">
                        {item.medicine?.dosageForm} {item.medicine?.strength} &bull;{' '}
                        {item.medicine?.packSize}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">{onHand}</td>
                      <td className="py-3 px-4 text-right text-[#A66B16] font-medium">
                        {reserved > 0 ? `${reserved}` : '0'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#0D5C5A]">{available}</td>
                      <td className="py-3 px-4 text-center">{statusBadge}</td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenHistory(item)}
                          className="h-8 text-xs text-[#0D5C5A] hover:bg-[#F0FDFA]"
                        >
                          Audit History
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && totalPages > 1 && (
          <div className="p-4 border-t border-[#EBECEF] flex items-center justify-between text-[12px] text-[#78879A]">
            <span>
              Showing {balances.length} of {total} SKUs
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-8 px-3"
              >
                &larr; Prev
              </Button>
              <span className="text-[#0F172A] font-medium">
                Page {page} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p - 1)}
                className="h-8 px-3"
              >
                Next &rarr;
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Stock Movement History Dialog */}
      <Dialog
        open={Boolean(historyBalance)}
        onOpenChange={(open) => !open && setHistoryBalance(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-bold text-[#0F172A]">
              Store Stock Movement History
            </DialogTitle>
            <p className="text-[12px] text-[#78879A]">
              Immutable audit ledger of balance adjustments, inward receipts, allocations, and
              dispensing for{' '}
              <strong className="text-[#0F172A]">{historyBalance?.medicine?.name}</strong>.
            </p>
          </DialogHeader>

          <div className="max-h-[360px] overflow-y-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-[#F8F9FB] border-b border-[#EBECEF] text-[10px] uppercase text-[#78879A] font-semibold sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-right">Delta Quantity</th>
                  <th className="py-2.5 px-3">Reference / Order ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBECEF]">
                {loadingMovements ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[#78879A]">
                      Loading audit ledger...
                    </td>
                  </tr>
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[#78879A]">
                      No movement transactions found for this SKU.
                    </td>
                  </tr>
                ) : (
                  movements.map((mov) => {
                    const delta = Number((mov as any).deltaQuantity ?? mov.quantityChange ?? 0);
                    const isPositive = delta > 0;
                    return (
                      <tr key={mov.id} className="hover:bg-[#F0FDFA]/50">
                        <td className="py-2 px-3 text-[#78879A]">
                          {new Date(mov.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 font-semibold text-[#0F172A]">
                          {mov.movementType}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-mono font-bold ${
                            isPositive ? 'text-[#0FAC26]' : 'text-[#DC3545]'
                          }`}
                        >
                          {isPositive ? `+${delta}` : delta}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-[#78879A]">
                          {(mov as any).referenceOrderId || mov.referenceId
                            ? `Order ${(mov as any).referenceOrderId || mov.referenceId}`
                            : 'Store Inward / Audit'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setHistoryBalance(null)}>
              Close Audit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
