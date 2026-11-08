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
import { Building2, Users, UserCheck, Shield, Plus, Store as StoreIcon, UserPlus } from 'lucide-react';

interface StoreDTO {
  id: string;
  code: string;
  name: string;
  city: string;
  address: string;
  status: string;
  staffCount?: number;
  ordersCount?: number;
}

interface StaffDTO {
  id: string;
  userId: string;
  fullName: string;
  designation: string;
  phone: string;
  email: string;
  status: string;
  store: {
    id: string;
    code: string;
    name: string;
    city: string;
  };
  createdAt: string;
}

interface PharmacistDTO {
  id: string;
  userId: string;
  fullName: string;
  registrationNumber?: string | null;
  phone: string;
  email: string;
  status: string;
  clinicalScope?: string;
  createdAt: string;
}

interface CustomerDTO {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  status: string;
  ordersCount: number;
  prescriptionsCount: number;
  createdAt: string;
}

export default function StoresAndDirectoryPage() {
  const [activeTab, setActiveTab] = React.useState<'stores' | 'staff' | 'pharmacists' | 'customers'>('stores');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Data states
  const [stores, setStores] = React.useState<StoreDTO[]>([]);
  const [staffList, setStaffList] = React.useState<StaffDTO[]>([]);
  const [pharmacistsList, setPharmacistsList] = React.useState<PharmacistDTO[]>([]);
  const [customersList, setCustomersList] = React.useState<CustomerDTO[]>([]);

  // Filter & Pagination
  const [searchQuery, setSearchQuery] = React.useState('');
  const [storeFilter, setStoreFilter] = React.useState<string>('ALL');
  const [customerPage, setCustomerPage] = React.useState(1);
  const customerPageSize = 15;

  // Modal states
  const [isStoreModalOpen, setIsStoreModalOpen] = React.useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = React.useState(false);
  const [isPharmacistModalOpen, setIsPharmacistModalOpen] = React.useState(false);

  // Form states
  const [storeForm, setStoreForm] = React.useState({
    code: '',
    name: '',
    city: 'Kolkata',
    address: '',
    status: 'ACTIVE',
  });

  const [staffForm, setStaffForm] = React.useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    designation: 'Store Staff',
    storeId: '',
  });

  const [pharmacistForm, setPharmacistForm] = React.useState({
    fullName: '',
    registrationNumber: '',
    phone: '',
    email: '',
    password: '',
  });

  const [formSubmitting, setFormSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [storesRes, staffRes, pharmacistsRes, customersRes] = await Promise.all([
        apiFetch<StoreDTO[]>('/admin/stores?detailed=true'),
        apiFetch<StaffDTO[]>('/admin/staff'),
        apiFetch<PharmacistDTO[]>('/admin/pharmacists'),
        apiFetch<CustomerDTO[]>('/admin/customers').catch(() => []),
      ]);

      setStores(storesRes || []);
      setStaffList(staffRes || []);
      setPharmacistsList(pharmacistsRes || []);
      setCustomersList(customersRes || []);

      if (storesRes && storesRes.length > 0 && !staffForm.storeId) {
        setStaffForm((prev) => ({ ...prev, storeId: storesRes[0].id }));
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load directory data.');
    } finally {
      setLoading(false);
    }
  }, [staffForm.storeId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Add Store
  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);
    try {
      await apiFetch('/admin/stores', {
        method: 'POST',
        body: JSON.stringify(storeForm),
      });
      setSuccessMsg(`Store "${storeForm.name}" (${storeForm.code}) registered successfully.`);
      setIsStoreModalOpen(false);
      setStoreForm({ code: '', name: '', city: 'Kolkata', address: '', status: 'ACTIVE' });
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create store.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Register Staff (Staff belongs to a store)
  const handleRegisterStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!staffForm.storeId) {
      setFormError('Please select an assigned store for this staff member.');
      return;
    }
    setFormSubmitting(true);
    try {
      await apiFetch('/admin/staff', {
        method: 'POST',
        body: JSON.stringify(staffForm),
      });
      setSuccessMsg(`Staff member "${staffForm.fullName}" registered and assigned to store.`);
      setIsStaffModalOpen(false);
      setStaffForm({
        fullName: '',
        phone: '',
        email: '',
        password: '',
        designation: 'Store Staff',
        storeId: stores[0]?.id || '',
      });
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to register staff.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Register Pharmacist
  const handleRegisterPharmacist = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);
    try {
      await apiFetch('/admin/pharmacists', {
        method: 'POST',
        body: JSON.stringify(pharmacistForm),
      });
      setSuccessMsg(`Pharmacist "${pharmacistForm.fullName}" registered successfully.`);
      setIsPharmacistModalOpen(false);
      setPharmacistForm({
        fullName: '',
        registrationNumber: '',
        phone: '',
        email: '',
        password: '',
      });
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to register pharmacist.');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 py-2">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#0F172A] sm:text-[28px] sm:leading-[36px]">
            Store &amp; Staff Directory
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => {
              setFormError(null);
              setIsStoreModalOpen(true);
            }}
            className="bg-[#0D5C5A] hover:bg-[#0A4846] text-white text-xs font-semibold h-9 gap-1.5 shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Store</span>
          </Button>

          <Button
            onClick={() => {
              setFormError(null);
              setIsStaffModalOpen(true);
            }}
            variant="outline"
            className="border-[#0D5C5A] text-[#0D5C5A] hover:bg-[#F0FDFA] text-xs font-semibold h-9 gap-1.5"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Register Staff</span>
          </Button>

          <Button
            onClick={() => {
              setFormError(null);
              setIsPharmacistModalOpen(true);
            }}
            variant="outline"
            className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold h-9 gap-1.5"
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Register Pharmacist</span>
          </Button>
        </div>
      </div>

      {successMsg && (
        <SemanticAlert
          type="success"
          title="Operation Succeeded"
          description={successMsg}
        />
      )}

      {error && (
        <SemanticAlert
          type="error"
          title="Directory Error"
          description={error}
        />
      )}

      {/* Overview Stat Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <div className="p-5 bg-white rounded-xl border border-[#EBECEF] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#78879A] font-medium">
            <span>Physical Stores</span>
            <StoreIcon className="h-4 w-4 text-[#0D5C5A]" />
          </div>
          <div className="text-[26px] leading-[32px] font-bold text-[#14161A]">{stores.length}</div>
          <span className="text-[11px] text-[#0D5C5A]">
            {stores.filter((s) => s.status === 'ACTIVE').length} active operational
          </span>
        </div>

        <div className="p-5 bg-white rounded-xl border border-[#EBECEF] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#78879A] font-medium">
            <span>Store Staff</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-[26px] leading-[32px] font-bold text-blue-600">{staffList.length}</div>
          <span className="text-[11px] text-slate-500">Assigned across stores</span>
        </div>

        <div className="p-5 bg-white rounded-xl border border-[#EBECEF] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#78879A] font-medium">
            <span>Pharmacists</span>
            <Shield className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-[26px] leading-[32px] font-bold text-emerald-600">{pharmacistsList.length}</div>
          <span className="text-[11px] text-emerald-700">Licensed verification officers</span>
        </div>

        <div className="p-5 bg-white rounded-xl border border-[#EBECEF] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#78879A] font-medium">
            <span>Registered Customers</span>
            <UserCheck className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-[26px] leading-[32px] font-bold text-purple-600">
            {loading ? '—' : customersList.length}
          </div>
          <span className="text-[11px] text-slate-500">Live PostgreSQL records</span>
        </div>
      </div>

      {/* Tabs Bar & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-[#EBECEF] pb-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'stores', label: `Stores (${stores.length})` },
            { id: 'staff', label: `Staff (${staffList.length})` },
            { id: 'pharmacists', label: `Pharmacists (${pharmacistsList.length})` },
            { id: 'customers', label: `Customers (${customersList.length})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === t.id
                  ? 'bg-[#0D5C5A] text-white shadow-xs'
                  : 'text-[#78879A] hover:bg-slate-100 hover:text-[#14161A]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Input
            placeholder="Search directory..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCustomerPage(1);
            }}
            className="h-8 text-xs bg-white w-full sm:w-[220px]"
          />

          {activeTab === 'staff' && (
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="h-8 text-xs border border-[#CBD5E1] rounded-md px-2 bg-white text-slate-700"
            >
              <option value="ALL">All Stores</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-[#78879A]">
          Loading directory entities...
        </div>
      ) : (
        <>
          {/* TAB 1: STORES */}
          {activeTab === 'stores' && (
            <div className="bg-white rounded-xl border border-[#EBECEF] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8F9FB] border-b border-[#EBECEF] text-[#78879A] font-semibold">
                      <th className="py-3.5 px-4">Store Code</th>
                      <th className="py-3.5 px-4">Store Name</th>
                      <th className="py-3.5 px-4">City</th>
                      <th className="py-3.5 px-4">Address</th>
                      <th className="py-3.5 px-4 text-center">Assigned Staff</th>
                      <th className="py-3.5 px-4 text-center">Orders Handled</th>
                      <th className="py-3.5 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBECEF]">
                    {stores
                      .filter((s) =>
                        !searchQuery ||
                        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.city.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((st) => (
                        <tr key={st.id} className="hover:bg-[#F0FDFA]/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-[#0D5C5A]">
                            {st.code}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-[#14161A]">
                            {st.name}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">{st.city}</td>
                          <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate" title={st.address}>
                            {st.address}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full text-[11px]">
                              {st.staffCount ?? 0} staff
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-medium text-slate-700">
                            {st.ordersCount ?? 0}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                st.status === 'ACTIVE'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {st.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: STORE STAFF (Staff belongs to a Store) */}
          {activeTab === 'staff' && (
            <div className="bg-white rounded-xl border border-[#EBECEF] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8F9FB] border-b border-[#EBECEF] text-[#78879A] font-semibold">
                      <th className="py-3.5 px-4">Staff Name</th>
                      <th className="py-3.5 px-4">Assigned Store</th>
                      <th className="py-3.5 px-4">Designation</th>
                      <th className="py-3.5 px-4">Phone</th>
                      <th className="py-3.5 px-4">Email</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Registered At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBECEF]">
                    {staffList
                      .filter((sp) => {
                        if (storeFilter !== 'ALL' && sp.store.id !== storeFilter) return false;
                        if (!searchQuery) return true;
                        const q = searchQuery.toLowerCase();
                        return (
                          sp.fullName.toLowerCase().includes(q) ||
                          sp.email.toLowerCase().includes(q) ||
                          sp.phone.includes(q) ||
                          sp.store.name.toLowerCase().includes(q)
                        );
                      })
                      .map((sp) => (
                        <tr key={sp.id} className="hover:bg-[#F0FDFA]/40 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-[#14161A]">{sp.fullName}</td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-[#0D5C5A] bg-[#F0FDFA] border border-[#99F6E4] px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                              <span>{sp.store.name}</span>
                              <span className="text-[10px] text-slate-500 font-mono">({sp.store.code})</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">{sp.designation}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">{sp.phone}</td>
                          <td className="py-3.5 px-4 text-slate-600">{sp.email}</td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                              {sp.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-400">
                            {new Date(sp.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PHARMACISTS */}
          {activeTab === 'pharmacists' && (
            <div className="bg-white rounded-xl border border-[#EBECEF] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8F9FB] border-b border-[#EBECEF] text-[#78879A] font-semibold">
                      <th className="py-3.5 px-4">Pharmacist Name</th>
                      <th className="py-3.5 px-4">Registration #</th>
                      <th className="py-3.5 px-4">Clinical Scope</th>
                      <th className="py-3.5 px-4">Phone</th>
                      <th className="py-3.5 px-4">Email</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Registered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBECEF]">
                    {pharmacistsList
                      .filter((ph) => {
                        if (!searchQuery) return true;
                        const q = searchQuery.toLowerCase();
                        return (
                          ph.fullName.toLowerCase().includes(q) ||
                          ph.email.toLowerCase().includes(q) ||
                          (ph.registrationNumber && ph.registrationNumber.toLowerCase().includes(q))
                        );
                      })
                      .map((ph) => (
                        <tr key={ph.id} className="hover:bg-[#F0FDFA]/40 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-[#14161A] flex items-center gap-1.5">
                            <Shield className="h-3.5 w-3.5 text-emerald-600" />
                            <span>{ph.fullName}</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                            {ph.registrationNumber || 'Pending Verification'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F0FDFA] text-[#0D5C5A] border border-[#99F6E4]">
                              Independent Platform Verifier
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">{ph.phone}</td>
                          <td className="py-3.5 px-4 text-slate-600">{ph.email}</td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                              {ph.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-400">
                            {new Date(ph.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: CUSTOMERS */}
          {activeTab === 'customers' && (() => {
            const filtered = customersList.filter((c) => {
              if (!searchQuery) return true;
              const q = searchQuery.toLowerCase();
              return (
                c.fullName.toLowerCase().includes(q) ||
                c.phone.includes(q) ||
                (c.email && c.email.toLowerCase().includes(q))
              );
            });
            const totalPages = Math.max(1, Math.ceil(filtered.length / customerPageSize));
            const paginated = filtered.slice((customerPage - 1) * customerPageSize, customerPage * customerPageSize);

            return (
              <div className="bg-white rounded-xl border border-[#EBECEF] shadow-xs overflow-hidden space-y-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F8F9FB] border-b border-[#EBECEF] text-[#78879A] font-semibold">
                        <th className="py-3.5 px-4">Customer Name</th>
                        <th className="py-3.5 px-4">Phone</th>
                        <th className="py-3.5 px-4">Email</th>
                        <th className="py-3.5 px-4 text-center">Orders Placed</th>
                        <th className="py-3.5 px-4 text-center">Prescriptions Uploaded</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Member Since</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EBECEF]">
                      {paginated.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500">
                            No customer records found matching query.
                          </td>
                        </tr>
                      ) : (
                        paginated.map((c) => (
                          <tr key={c.id} className="hover:bg-[#F0FDFA]/40 transition-colors">
                            <td className="py-3.5 px-4 font-semibold text-[#14161A]">{c.fullName}</td>
                            <td className="py-3.5 px-4 font-mono text-slate-600">{c.phone}</td>
                            <td className="py-3.5 px-4 text-slate-600">{c.email || '—'}</td>
                            <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                              {c.ordersCount}
                            </td>
                            <td className="py-3.5 px-4 text-center font-medium text-slate-700">
                              {c.prescriptionsCount}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                                {c.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right text-slate-400">
                              {new Date(c.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="p-3 border-t border-[#EBECEF] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                  <div>
                    Showing{' '}
                    <span className="font-semibold text-slate-800">
                      {filtered.length === 0 ? 0 : (customerPage - 1) * customerPageSize + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-semibold text-slate-800">
                      {Math.min(customerPage * customerPageSize, filtered.length)}
                    </span>{' '}
                    of <span className="font-semibold text-slate-800">{filtered.length}</span> live database customers
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={customerPage <= 1}
                      onClick={() => setCustomerPage((p) => Math.max(1, p - 1))}
                      className="h-7 text-xs"
                    >
                      &larr; Prev
                    </Button>
                    <span className="text-xs px-2 font-medium">
                      Page {customerPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={customerPage >= totalPages}
                      onClick={() => setCustomerPage((p) => Math.min(totalPages, p + 1))}
                      className="h-7 text-xs"
                    >
                      Next &rarr;
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}
        </>
      )}

      {/* DIALOG 1: ADD STORE */}
      <Dialog open={isStoreModalOpen} onOpenChange={setIsStoreModalOpen}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#14161A]">
              Register New Pharmacy Store
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateStore} className="space-y-3 pt-2">
            {formError && (
              <SemanticAlert type="error" title="Validation Error" description={formError} />
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Store Code *
                </label>
                <Input
                  required
                  placeholder="e.g. KOL-004"
                  value={storeForm.code}
                  onChange={(e) => setStoreForm({ ...storeForm, code: e.target.value })}
                  className="h-8 text-xs font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  City *
                </label>
                <Input
                  required
                  placeholder="e.g. Kolkata"
                  value={storeForm.city}
                  onChange={(e) => setStoreForm({ ...storeForm, city: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Store Name *
              </label>
              <Input
                required
                placeholder="e.g. Newtown Action Area II Hub"
                value={storeForm.name}
                onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Street Address *
              </label>
              <textarea
                required
                rows={2}
                placeholder="Full address of physical retail location..."
                value={storeForm.address}
                onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                className="w-full text-xs p-2 rounded-md border border-[#CBD5E1] bg-white focus:outline-none focus:border-[#0D5C5A]"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsStoreModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={formSubmitting}
                className="bg-[#0D5C5A] hover:bg-[#0A4846] text-white"
              >
                {formSubmitting ? 'Registering...' : 'Register Store'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: REGISTER STORE STAFF (Staff belongs to a Store) */}
      <Dialog open={isStaffModalOpen} onOpenChange={setIsStaffModalOpen}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#14161A]">
              Register Store Staff Member
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleRegisterStaff} className="space-y-3 pt-2">
            {formError && (
              <SemanticAlert type="error" title="Validation Error" description={formError} />
            )}

            <div className="p-2.5 bg-[#F0FDFA] rounded-lg border border-[#99F6E4] text-xs text-[#0D5C5A]">
              <strong>Store Assignment Policy:</strong> Store staff members must belong to a physical pharmacy store location to handle stock picking, packing, and counter handovers.
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assigned Store *
              </label>
              <select
                required
                value={staffForm.storeId}
                onChange={(e) => setStaffForm({ ...staffForm, storeId: e.target.value })}
                className="w-full h-8 text-xs border border-[#CBD5E1] rounded-md px-2 bg-white text-slate-800 font-medium"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code}) - {s.city}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <Input
                  required
                  placeholder="e.g. Ramesh Chandra"
                  value={staffForm.fullName}
                  onChange={(e) => setStaffForm({ ...staffForm, fullName: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Designation
                </label>
                <Input
                  placeholder="e.g. Dispensing Associate"
                  value={staffForm.designation}
                  onChange={(e) => setStaffForm({ ...staffForm, designation: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Phone *
                </label>
                <Input
                  required
                  placeholder="+919830000000"
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address *
                </label>
                <Input
                  required
                  type="email"
                  placeholder="staff@pharmacy.com"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Initial Password (Optional)
              </label>
              <Input
                type="password"
                placeholder="Defaults to PharmacyStaff@2026"
                value={staffForm.password}
                onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsStaffModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={formSubmitting}
                className="bg-[#0D5C5A] hover:bg-[#0A4846] text-white"
              >
                {formSubmitting ? 'Registering...' : 'Register Staff'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: REGISTER PHARMACIST */}
      <Dialog open={isPharmacistModalOpen} onOpenChange={setIsPharmacistModalOpen}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#14161A]">
              Register Licensed Pharmacist
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleRegisterPharmacist} className="space-y-3 pt-2">
            {formError && (
              <SemanticAlert type="error" title="Validation Error" description={formError} />
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pharmacist Full Name *
                </label>
                <Input
                  required
                  placeholder="e.g. Dr. Subir Sen"
                  value={pharmacistForm.fullName}
                  onChange={(e) => setPharmacistForm({ ...pharmacistForm, fullName: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pharmacy Council Reg. #
                </label>
                <Input
                  placeholder="e.g. WB-PHA-94821"
                  value={pharmacistForm.registrationNumber}
                  onChange={(e) =>
                    setPharmacistForm({ ...pharmacistForm, registrationNumber: e.target.value })
                  }
                  className="h-8 text-xs font-mono uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Phone *
                </label>
                <Input
                  required
                  placeholder="+919830000000"
                  value={pharmacistForm.phone}
                  onChange={(e) => setPharmacistForm({ ...pharmacistForm, phone: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address *
                </label>
                <Input
                  required
                  type="email"
                  placeholder="pharmacist@pharmacy.com"
                  value={pharmacistForm.email}
                  onChange={(e) => setPharmacistForm({ ...pharmacistForm, email: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#F0FDFA] border border-[#99F6E4] text-xs text-[#0D5C5A] leading-relaxed">
              <strong>Independent Platform Role:</strong> Pharmacists in this system operate independently across the entire pharmacy network to verify prescriptions and approve statutory drug schedules. They do not belong to a single physical store.
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Initial Password (Optional)
              </label>
              <Input
                type="password"
                placeholder="Defaults to PharmacistPass@2026"
                value={pharmacistForm.password}
                onChange={(e) => setPharmacistForm({ ...pharmacistForm, password: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPharmacistModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={formSubmitting}
                className="bg-[#0D5C5A] hover:bg-[#0A4846] text-white"
              >
                {formSubmitting ? 'Registering...' : 'Register Pharmacist'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
