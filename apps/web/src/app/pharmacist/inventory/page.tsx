'use client';

import * as React from 'react';
import { Search, Filter, History, Store, Loader2 } from 'lucide-react';
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
      {/* Header with Store Context */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F7F5FD] text-[#6240E8] border border-[#D6D1F7]">
              <Store className="h-3 w-3" /> Salt Lake Store (KOL-001)
            </span>
          </div>
          <h1 className="text-[24px] font-bold tracking-tight text-[#351F65]">
            Store Stock Inventory
          </h1>
          <p className="text-[14px] text-[#78879A]">
            Current stock quantities and reorder safety thresholds for your assigned pharmacy store.
          </p>
        </div>
      </div>

      {error && <SemanticAlert type="error" title="Inventory Error" description={error} />}

      {/* Filter Toolbar */}
      <div className="rounded-[12px] border border-[#EAE8F0] bg-white p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#78879A]" />
          <Input
            placeholder="Search medicine name or SKU in store..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 bg-[#F8F9FB] border-[#EAE8F0]"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[13px] text-[#6C757D]">
            <Filter className="h-3.5 w-3.5" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-[38px] rounded-[6px] border border-[#CED4DA] bg-white px-2.5 text-[13px] text-[#14161A] focus:outline-none focus:border-[#6240E8]"
          >
            <option value="ALL">All Stock Statuses</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Stock Table */}
      <div className="rounded-[12px] border border-[#EAE8F0] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#EAE8F0] bg-[#F8F9FB] text-[#78879A] font-semibold">
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Medicine Name</th>
                <th className="py-3 px-4 text-right">Available Stock</th>
                <th className="py-3 px-4 text-right">Reorder Threshold</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Last Stock Update</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE8F0]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#78879A]">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-[#6240E8]" />
                      <span>Loading store stock...</span>
                    </div>
                  </td>
                </tr>
              ) : balances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#78879A]">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <p className="font-semibold text-[#351F65]">
                        No medicines found in store stock
                      </p>
                      <p className="text-[12px]">Try modifying your search or status filter.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                balances.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F8F9FB]/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-[12px] font-medium text-[#351F65]">
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
                    <td className="py-3 px-4 text-right font-bold text-[15px] text-[#14161A]">
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenHistory(item)}
                        className="h-8 text-[12px] inline-flex items-center gap-1.5 text-[#351F65]"
                      >
                        <History className="h-3.5 w-3.5" />
                        <span>Movements</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-[#EAE8F0] px-4 py-3 text-[13px] text-[#78879A]">
          <div>
            Showing <span className="font-semibold text-[#14161A]">{balances.length}</span> of{' '}
            <span className="font-semibold text-[#14161A]">{total}</span> items in store
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
            <span className="px-2 font-medium text-[#351F65]">
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

      {/* Movement Audit Trail Modal (Read Only) */}
      <Dialog
        open={Boolean(historyBalance)}
        onOpenChange={(open) => !open && setHistoryBalance(null)}
      >
        <DialogContent className="max-w-[620px]">
          <DialogHeader>
            <DialogTitle className="text-[#351F65] text-[18px]">
              Store Stock Movement History
            </DialogTitle>
          </DialogHeader>

          {historyBalance && (
            <div className="space-y-4">
              <div className="rounded-[8px] bg-[#F8F9FB] p-3 border border-[#EAE8F0] text-[12px]">
                <p className="font-semibold text-[#351F65]">{historyBalance.medicine?.name}</p>
                <p className="text-[#78879A] font-mono">SKU: {historyBalance.medicine?.sku}</p>
              </div>

              <div className="max-h-[340px] overflow-y-auto border border-[#EAE8F0] rounded-[8px]">
                <table className="w-full text-left text-[12px] border-collapse">
                  <thead>
                    <tr className="bg-[#F8F9FB] border-b border-[#EAE8F0] text-[#78879A] font-semibold">
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Event</th>
                      <th className="p-2.5 text-right">Before</th>
                      <th className="p-2.5 text-right">Change</th>
                      <th className="p-2.5 text-right">After</th>
                      <th className="p-2.5">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAE8F0]">
                    {loadingMovements ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-[#78879A]">
                          <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
                          Loading movements...
                        </td>
                      </tr>
                    ) : movements.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-[#78879A]">
                          No movements found for this item.
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
                          <td className="p-2.5 font-medium text-[#351F65]">{m.movementType}</td>
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
                            className="p-2.5 text-[#6C757D] max-w-[180px] truncate"
                            title={m.reason || ''}
                          >
                            {m.reason || '—'}
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
