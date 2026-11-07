'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { apiFetch } from '@/lib/api/client';
import { CustomerAddressDTO } from '@pharmacy/shared-types';

export default function CustomerAddressesPage() {
  const [addresses, setAddresses] = React.useState<CustomerAddressDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Dialog State
  const [isOpen, setIsOpen] = React.useState(false);
  const [editingAddress, setEditingAddress] = React.useState<CustomerAddressDTO | null>(null);
  const [label, setLabel] = React.useState('Home');
  const [recipientName, setRecipientName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [addressLine1, setAddressLine1] = React.useState('');
  const [addressLine2, setAddressLine2] = React.useState('');
  const [landmark, setLandmark] = React.useState('');
  const [city, setCity] = React.useState('Kolkata');
  const [state, setState] = React.useState('West Bengal');
  const [postalCode, setPostalCode] = React.useState('');
  const [isDefault, setIsDefault] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [dialogError, setDialogError] = React.useState<string | null>(null);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<CustomerAddressDTO[]>('/customer/addresses');
      setAddresses(res || []);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load addresses.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchAddresses();
  }, []);

  const openAddDialog = () => {
    setEditingAddress(null);
    setLabel('Home');
    setRecipientName('');
    setPhone('');
    setAddressLine1('');
    setAddressLine2('');
    setLandmark('');
    setCity('Kolkata');
    setState('West Bengal');
    setPostalCode('');
    setIsDefault(addresses.length === 0);
    setDialogError(null);
    setIsOpen(true);
  };

  const openEditDialog = (addr: CustomerAddressDTO) => {
    setEditingAddress(addr);
    setLabel(addr.label);
    setRecipientName(addr.recipientName);
    setPhone(addr.phone);
    setAddressLine1(addr.addressLine1);
    setAddressLine2(addr.addressLine2 || '');
    setLandmark(addr.landmark || '');
    setCity(addr.city);
    setState(addr.state);
    setPostalCode(addr.postalCode);
    setIsDefault(addr.isDefault);
    setDialogError(null);
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim() || !phone.trim() || !addressLine1.trim() || !postalCode.trim()) {
      setDialogError('Please fill in all mandatory fields.');
      return;
    }

    if (!/^\d{6}$/.test(postalCode.trim())) {
      setDialogError('Postal code must be a valid 6-digit Indian PIN code.');
      return;
    }

    if (!/^\d{10}$/.test(phone.trim())) {
      setDialogError('Phone must be a valid 10-digit mobile number.');
      return;
    }

    setSaving(true);
    setDialogError(null);

    const payload = {
      label: label.trim() || 'Home',
      recipientName: recipientName.trim(),
      phone: phone.trim(),
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim() || undefined,
      landmark: landmark.trim() || undefined,
      city: city.trim(),
      state: state.trim(),
      postalCode: postalCode.trim(),
      isDefault,
    };

    try {
      if (editingAddress) {
        const updated = await apiFetch<CustomerAddressDTO>(
          `/customer/addresses/${editingAddress.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify(payload),
          },
        );
        setAddresses((prev) =>
          prev.map((a) => {
            if (updated.isDefault && a.id !== updated.id) {
              return { ...a, isDefault: false };
            }
            return a.id === updated.id ? updated : a;
          }),
        );
      } else {
        const created = await apiFetch<CustomerAddressDTO>('/customer/addresses', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setAddresses((prev) => {
          if (created.isDefault) {
            return [...prev.map((a) => ({ ...a, isDefault: false })), created];
          }
          return [...prev, created];
        });
      }
      setIsOpen(false);
    } catch (err: unknown) {
      setDialogError((err as Error).message || 'Failed to save address.');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await apiFetch(`/customer/addresses/${id}/default`, {
        method: 'POST',
      });
      setAddresses((prev) =>
        prev.map((a) => ({
          ...a,
          isDefault: a.id === id,
        })),
      );
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to set default address.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    try {
      await apiFetch(`/customer/addresses/${id}`, {
        method: 'DELETE',
      });
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to delete address.');
    }
  };

  return (
    <div className="max-w-[850px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#EBECEF]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            Saved Delivery Addresses
          </h1>
          <p className="text-sm text-[#78879A] mt-1">
            Manage your Kolkata &amp; Howrah home or work delivery locations.
          </p>
        </div>
        <Button
          onClick={openAddDialog}
          className="text-xs bg-[#0D5C5A] text-white hover:bg-[#0A4846]"
        >
          + Add New Address
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">Loading addresses...</div>
      ) : error ? (
        <Card className="p-8 border-red-200 bg-red-50 text-center">
          <span className="font-bold text-xs uppercase text-red-600 block mb-1">Notice</span>
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </Card>
      ) : addresses.length === 0 ? (
        <Card className="p-12 border-[#EBECEF] bg-white text-center">
          <h3 className="text-base font-semibold text-slate-800">No Saved Addresses</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Save your delivery address for fast and seamless checkout across Kolkata and Howrah.
          </p>
          <Button
            size="sm"
            onClick={openAddDialog}
            className="mt-4 text-xs bg-[#0D5C5A] text-white"
          >
            + Add Address
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <Card
              key={addr.id}
              className={`border transition-all p-5 flex flex-col justify-between ${
                addr.isDefault
                  ? 'border-[#0D5C5A] bg-[#F8F9FA] shadow-2xs'
                  : 'border-[#EBECEF] bg-white hover:border-slate-300'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-[#0F172A]">{addr.label}</span>
                    {addr.isDefault && (
                      <Badge className="bg-[#0D5C5A] text-white text-[10px] font-semibold">
                        Default
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    PIN: {addr.postalCode}
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-900">{addr.recipientName}</p>
                  <p className="text-slate-500">+91 {addr.phone}</p>
                  <p className="pt-1 text-slate-700 leading-relaxed">
                    {addr.addressLine1}
                    {addr.addressLine2 && `, ${addr.addressLine2}`}
                    {addr.landmark && ` (Near ${addr.landmark})`}
                  </p>
                  <p className="text-slate-500 font-medium">
                    {addr.city}, {addr.state} — {addr.postalCode}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
                <div>
                  {!addr.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetDefault(addr.id)}
                      className="text-xs h-8 px-2 text-[#0D5C5A] hover:bg-[#F0FDFA]"
                    >
                      Set as Default
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(addr)}
                    className="text-xs h-8 px-2.5 text-slate-600 border-slate-200"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(addr.id)}
                    className="text-xs h-8 px-2.5 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Address Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#0F172A]">
              {editingAddress ? 'Edit Delivery Address' : 'Add New Delivery Address'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            {dialogError && (
              <div className="p-3 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                <span className="font-bold uppercase text-[10px] px-1 py-0.5 bg-red-200 rounded">
                  Error
                </span>
                <span>{dialogError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Label (e.g. Home) *</label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Home, Office, Parents"
                  className="h-10 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Recipient Name *</label>
                <Input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Recipient full name"
                  className="h-10 text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Phone (10 digits) *</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  maxLength={10}
                  className="h-10 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  PIN Code (6 digits) *
                </label>
                <Input
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="700091"
                  maxLength={6}
                  className="h-10 text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Flat / House / Street *
              </label>
              <Input
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                placeholder="Flat 4B, Tower 2, Sector V"
                className="h-10 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Area / Colony (Optional)
              </label>
              <Input
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                placeholder="Salt Lake City"
                className="h-10 text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Landmark</label>
                <Input
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="Near Metro Gate"
                  className="h-10 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">City *</label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-10 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">State *</label>
                <Input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="h-10 text-xs"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isDefaultAddr"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#0D5C5A] focus:ring-[#0D5C5A]"
              />
              <label
                htmlFor="isDefaultAddr"
                className="text-xs text-slate-700 font-medium select-none cursor-pointer"
              >
                Set as default delivery address
              </label>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="text-xs bg-[#0D5C5A] text-white hover:bg-[#0A4846]"
              >
                {saving ? 'Saving...' : editingAddress ? 'Save Changes' : 'Save Address'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
