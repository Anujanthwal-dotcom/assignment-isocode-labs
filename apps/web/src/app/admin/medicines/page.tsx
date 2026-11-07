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
import { formatINR } from '@pharmacy/validation';
import type { MedicineDTO, MedicineSchedule } from '@pharmacy/shared-types';

const SCHEDULE_LABELS: Record<string, string> = {
  OTC: 'OTC',
  SCHEDULE_H: 'Schedule H',
  SCHEDULE_H1: 'Schedule H1',
  SCHEDULE_X: 'Schedule X',
  NARCOTIC: 'Narcotic',
  UNKNOWN: 'Unknown',
};

export default function MedicineCataloguePage() {
  const [medicines, setMedicines] = React.useState<MedicineDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Search & Filters
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [scheduleFilter, setScheduleFilter] = React.useState<string>('ALL');
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [total, setTotal] = React.useState(0);

  // Add / Edit Modal State
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingMedicine, setEditingMedicine] = React.useState<MedicineDTO | null>(null);
  const [formSubmitting, setFormSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = React.useState({
    sku: '',
    name: '',
    brandName: '',
    genericName: '',
    manufacturer: '',
    strength: '',
    dosageForm: '',
    packSize: '',
    schedule: 'SCHEDULE_H' as MedicineSchedule,
    mrp: '',
  });

  // Deactivate Confirm Modal
  const [deactivatingMedicine, setDeactivatingMedicine] = React.useState<MedicineDTO | null>(null);
  const [statusSubmitting, setStatusSubmitting] = React.useState(false);

  // Fetch medicines
  const fetchMedicines = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '10');
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (scheduleFilter !== 'ALL') params.set('schedule', scheduleFilter);

      const res = await apiFetch<{
        data: MedicineDTO[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>(`/medicines?${params.toString()}`);

      setMedicines(res.data);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to fetch medicines catalogue.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, scheduleFilter]);

  React.useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  // Handle open add modal
  const handleOpenAdd = () => {
    setEditingMedicine(null);
    setFormData({
      sku: '',
      name: '',
      brandName: '',
      genericName: '',
      manufacturer: '',
      strength: '',
      dosageForm: '',
      packSize: '',
      schedule: 'SCHEDULE_H',
      mrp: '',
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  // Handle open edit modal
  const handleOpenEdit = (med: MedicineDTO) => {
    setEditingMedicine(med);
    setFormData({
      sku: med.sku,
      name: med.name,
      brandName: med.brandName || '',
      genericName: med.genericName || '',
      manufacturer: med.manufacturer || '',
      strength: med.strength || '',
      dosageForm: med.dosageForm || '',
      packSize: med.packSize || '',
      schedule: med.schedule || 'UNKNOWN',
      mrp: String(med.mrp),
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  // Submit Add or Edit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    const mrpNum = parseFloat(formData.mrp);
    if (isNaN(mrpNum) || mrpNum <= 0) {
      setFormError('MRP must be a valid number greater than zero.');
      setFormSubmitting(false);
      return;
    }

    try {
      if (editingMedicine) {
        // Edit
        await apiFetch(`/medicines/${editingMedicine.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: formData.name,
            brandName: formData.brandName || undefined,
            genericName: formData.genericName || undefined,
            manufacturer: formData.manufacturer || undefined,
            strength: formData.strength || undefined,
            dosageForm: formData.dosageForm || undefined,
            packSize: formData.packSize || undefined,
            schedule: formData.schedule,
            mrp: mrpNum,
          }),
        });
      } else {
        // Create
        await apiFetch('/medicines', {
          method: 'POST',
          body: JSON.stringify({
            sku: formData.sku,
            name: formData.name,
            brandName: formData.brandName || undefined,
            genericName: formData.genericName || undefined,
            manufacturer: formData.manufacturer || undefined,
            strength: formData.strength || undefined,
            dosageForm: formData.dosageForm || undefined,
            packSize: formData.packSize || undefined,
            schedule: formData.schedule,
            mrp: mrpNum,
          }),
        });
      }

      setIsFormOpen(false);
      fetchMedicines();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to save medicine.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle status
  const handleToggleStatus = async () => {
    if (!deactivatingMedicine) return;
    setStatusSubmitting(true);
    try {
      const nextStatus = deactivatingMedicine.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await apiFetch(`/medicines/${deactivatingMedicine.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      setDeactivatingMedicine(null);
      fetchMedicines();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to change medicine status.');
    } finally {
      setStatusSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-[#351F65]">
            Medicine Catalogue
          </h1>
          <p className="text-[14px] text-[#78879A]">
            Manage pharmacy chain products, statutory drug schedules, and standard retail pricing.
          </p>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 bg-[#6240E8] hover:bg-[#542F9B] text-white"
        >
          <span>Add Medicine</span>
        </Button>
      </div>

      {error && <SemanticAlert type="error" title="Error Loading Catalogue" description={error} />}

      {/* Filter & Search Bar */}
      <div className="rounded-[12px] border border-[#EAE8F0] bg-white p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 min-w-[240px]">
          <Input
            placeholder="Search medicine name, SKU, or generic..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="bg-[#F8F9FB] border-[#EAE8F0]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-[13px] text-[#6C757D]">
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
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          <div className="flex items-center gap-1.5 text-[13px] text-[#6C757D] ml-2">
            <span>Schedule:</span>
          </div>
          <select
            value={scheduleFilter}
            onChange={(e) => {
              setScheduleFilter(e.target.value);
              setPage(1);
            }}
            className="h-[38px] rounded-[6px] border border-[#CED4DA] bg-white px-2.5 text-[13px] text-[#14161A] focus:outline-none focus:border-[#6240E8]"
          >
            <option value="ALL">All Schedules</option>
            <option value="OTC">OTC</option>
            <option value="SCHEDULE_H">Schedule H</option>
            <option value="SCHEDULE_H1">Schedule H1</option>
            <option value="SCHEDULE_X">Schedule X</option>
            <option value="NARCOTIC">Narcotic</option>
          </select>
        </div>
      </div>

      {/* Catalogue Table */}
      <div className="rounded-[12px] border border-[#EAE8F0] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#EAE8F0] bg-[#F8F9FB] text-[#78879A] font-semibold">
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Medicine</th>
                <th className="py-3 px-4">Generic</th>
                <th className="py-3 px-4">Strength / Form</th>
                <th className="py-3 px-4">Schedule</th>
                <th className="py-3 px-4 text-right">MRP (INR)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE8F0]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#78879A]">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#6240E8] border-t-transparent rounded-full animate-spin" />
                      <span>Loading catalogue entries...</span>
                    </div>
                  </td>
                </tr>
              ) : medicines.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#78879A]">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <p className="font-semibold text-[#351F65]">No medicines found</p>
                      <p className="text-[12px]">
                        Try adjusting your search criteria or add a new medicine.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                medicines.map((med) => (
                  <tr key={med.id} className="hover:bg-[#F8F9FB]/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-[12px] font-medium text-[#351F65]">
                      {med.sku}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#14161A]">{med.name}</div>
                      {med.brandName && (
                        <div className="text-[11px] text-[#78879A]">{med.brandName}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#6C757D]">{med.genericName || '—'}</td>
                    <td className="py-3 px-4 text-[#6C757D]">
                      {med.strength || med.dosageForm
                        ? `${med.strength || ''} ${med.dosageForm ? `(${med.dosageForm})` : ''}`
                        : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#F7F5FD] text-[#6240E8] border border-[#D6D1F7]">
                        {SCHEDULE_LABELS[med.schedule] || med.schedule}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-[#14161A]">
                      {formatINR(med.mrp)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {med.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#E8F8EC] text-[#0FAC26] border border-[#B0E6BC]">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#FDF2F2] text-[#DC3545] border border-[#F9CACA]">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(med)}
                          className="px-2 py-0.5 rounded text-xs font-semibold text-[#6240E8] hover:bg-[#F7F5FD]"
                          title="Edit Medicine"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeactivatingMedicine(med)}
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            med.status === 'ACTIVE'
                              ? 'text-[#DC3545] hover:bg-[#FDF2F2]'
                              : 'text-[#0FAC26] hover:bg-[#E8F8EC]'
                          }`}
                          title={
                            med.status === 'ACTIVE' ? 'Deactivate Medicine' : 'Activate Medicine'
                          }
                        >
                          {med.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
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
            Showing total <span className="font-semibold text-[#14161A]">{total}</span> medicines
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

      {/* Add / Edit Medicine Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="text-[#351F65] text-[18px]">
              {editingMedicine ? 'Edit Medicine' : 'Add New Medicine'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {formError && (
              <SemanticAlert type="error" title="Validation Error" description={formError} />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-[#351F65] mb-1">
                  SKU <span className="text-[#DC3545]">*</span>
                </label>
                <Input
                  required
                  disabled={Boolean(editingMedicine)}
                  placeholder="e.g. MED-MET-500-001"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="font-mono"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#351F65] mb-1">
                  Medicine Name <span className="text-[#DC3545]">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Metformin 500 mg"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#351F65] mb-1">
                  Brand Name
                </label>
                <Input
                  placeholder="e.g. Glyciphage"
                  value={formData.brandName}
                  onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#351F65] mb-1">
                  Generic Name
                </label>
                <Input
                  placeholder="e.g. Metformin"
                  value={formData.genericName}
                  onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#351F65] mb-1">
                  Manufacturer
                </label>
                <Input
                  placeholder="e.g. Franco-Indian Ltd"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#351F65] mb-1">
                  Strength
                </label>
                <Input
                  placeholder="e.g. 500 mg"
                  value={formData.strength}
                  onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#351F65] mb-1">
                  Dosage Form
                </label>
                <Input
                  placeholder="e.g. Tablet, Syrup"
                  value={formData.dosageForm}
                  onChange={(e) => setFormData({ ...formData, dosageForm: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#351F65] mb-1">
                  Pack Size
                </label>
                <Input
                  placeholder="e.g. 15 tablets"
                  value={formData.packSize}
                  onChange={(e) => setFormData({ ...formData, packSize: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#351F65] mb-1">
                  Statutory Drug Schedule
                </label>
                <select
                  value={formData.schedule}
                  onChange={(e) =>
                    setFormData({ ...formData, schedule: e.target.value as MedicineSchedule })
                  }
                  className="h-[44px] w-full rounded-[8px] border border-[#CED4DA] bg-white px-3 text-[14px] text-[#14161A] focus:outline-none focus:border-[#6240E8]"
                >
                  <option value="OTC">OTC (Over the Counter)</option>
                  <option value="SCHEDULE_H">Schedule H</option>
                  <option value="SCHEDULE_H1">Schedule H1</option>
                  <option value="SCHEDULE_X">Schedule X</option>
                  <option value="NARCOTIC">Narcotic</option>
                  <option value="UNKNOWN">Unknown</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#351F65] mb-1">
                  MRP (₹ INR) <span className="text-[#DC3545]">*</span>
                </label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 30.00"
                  value={formData.mrp}
                  onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                disabled={formSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={formSubmitting}
                className="bg-[#6240E8] hover:bg-[#542F9B] text-white"
              >
                {formSubmitting && (
                  <span className="mr-2 inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {editingMedicine ? 'Save Changes' : 'Create Medicine'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deactivate / Reactivate Confirmation Dialog */}
      <Dialog
        open={Boolean(deactivatingMedicine)}
        onOpenChange={(open) => !open && setDeactivatingMedicine(null)}
      >
        <DialogContent className="max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-[#351F65] text-[18px]">
              {deactivatingMedicine?.status === 'ACTIVE'
                ? 'Deactivate Medicine?'
                : 'Activate Medicine?'}
            </DialogTitle>
          </DialogHeader>

          <p className="text-[13px] text-[#6C757D] leading-relaxed">
            {deactivatingMedicine?.status === 'ACTIVE'
              ? `Are you sure you want to deactivate ${deactivatingMedicine?.name} (${deactivatingMedicine?.sku})? Inactive medicines cannot receive daily stock imports or manual stock additions. Existing stock history remains preserved.`
              : `Are you sure you want to reactivate ${deactivatingMedicine?.name} (${deactivatingMedicine?.sku})?`}
          </p>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeactivatingMedicine(null)}
              disabled={statusSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleToggleStatus}
              disabled={statusSubmitting}
              className={
                deactivatingMedicine?.status === 'ACTIVE'
                  ? 'bg-[#DC3545] hover:bg-[#c82333] text-white'
                  : 'bg-[#0FAC26] hover:bg-[#0d9220] text-white'
              }
            >
              {statusSubmitting && (
                <span className="mr-2 inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {deactivatingMedicine?.status === 'ACTIVE'
                ? 'Confirm Deactivation'
                : 'Confirm Activation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
