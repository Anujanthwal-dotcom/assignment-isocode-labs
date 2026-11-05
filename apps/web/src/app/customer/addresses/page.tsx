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
import { MapPin, Plus, Edit2, Trash2, Phone, AlertCircle } from 'lucide-react';
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
      setDialogError('Please fill in all required fields.');
      return;
    }

    setSaving(true);
    setDialogError(null);

    const payload = {
      label: label.trim(),
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
        await apiFetch(`/customer/addresses/${editingAddress.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/customer/addresses', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setIsOpen(false);
      await fetchAddresses();
    } catch (err: unknown) {
      setDialogError((err as Error).message || 'Failed to save address.');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await apiFetch(`/customer/addresses/${id}/default`, {
        method: 'PATCH',
      });
      await fetchAddresses();
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
      await fetchAddresses();
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to delete address.');
    }
  };

  return (
    <div className="max-w-[850px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#EAE8F0]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#351F65]">
            Saved Delivery Addresses
          </h1>
          <p className="text-sm text-[#78879A] mt-1">
            Manage your Kolkata &amp; Howrah home or work delivery locations.
          </p>
        </div>
        <Button
          onClick={openAddDialog}
          className="flex items-center gap-1.5 text-xs bg-[#6240E8] text-white hover:bg-[#5233D0]"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Address</span>
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">
          Loading addresses...
        </div>
      ) : error ? (
        <Card className="p-8 border-red-200 bg-red-50 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </Card>
      ) : addresses.length === 0 ? (
        <Card className="p-12 border-[#EAE8F0] bg-white text-center">
          <MapPin className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No Saved Addresses</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Save your delivery address for fast and seamless checkout across Kolkata and Howrah.
          </p>
          <Button
            size="sm"
            onClick={openAddDialog}
            className="mt-4 text-xs bg-[#6240E8] text-white"
          >
            Add Address
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <Card
              key={addr.id}
              className={`border transition-all p-5 flex flex-col justify-between ${
                addr.isDefault
                  ? 'border-[#6240E8] bg-[#FDFCFE] shadow-2xs'
                  : 'border-[#EAE8F0] bg-white hover:border-slate-300'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-[#351F65]">{addr.label}</span>
                    {addr.isDefault && (
                      <Badge className="bg-[#6240E8] text-white text-[10px] font-semibold">
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
                  <p className="flex items-center gap-1.5 text-slate-500">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>+91 {addr.phone}</span>
                  </p>
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
                      className="text-xs h-8 px-2 text-[#6240E8] hover:bg-[#F7F5FD]"
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
                    <Edit2 className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(addr.id)}
                    className="text-xs h-8 px-2.5 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
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
            <DialogTitle className="text-lg font-bold text-[#351F65]">
              {editingAddress ? 'Edit Delivery Address' : 'Add New Delivery Address'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            {dialogError && (
              <div className="p-3 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{dialogError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Label *</label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Home, Work, Parents"
                  className="h-9 text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Recipient Name *</label>
                <Input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Debasish Ghosh"
                  className="h-9 text-sm"
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
                  className="h-9 text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">PIN Code (6 digits) *</label>
                <Input
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="700091"
                  maxLength={6}
                  className="h-9 text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Address Line 1 *</label>
              <Input
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                placeholder="House / Flat No., Building Name, Street"
                className="h-9 text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Address Line 2 (Optional)</label>
                <Input
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Area / Locality"
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Landmark (Optional)</label>
                <Input
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="Near City Centre"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">City *</label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-9 text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">State *</label>
                <Input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="h-9 text-sm"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isDefaultCheckbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded text-[#6240E8] focus:ring-[#6240E8]"
              />
              <label htmlFor="isDefaultCheckbox" className="text-xs font-medium text-slate-700 cursor-pointer">
                Set as my default delivery address
              </label>
            </div>

            <DialogFooter className="pt-4">
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
                className="text-xs bg-[#6240E8] text-white hover:bg-[#5233D0]"
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
