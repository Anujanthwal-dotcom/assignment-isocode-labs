'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  ChevronDown,
  Navigation,
  Plus,
  Check,
  Loader2,
  Compass,
  Edit3,
  Building,
} from 'lucide-react';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api/client';
import { CustomerAddressDTO } from '@pharmacy/shared-types';

const FALLBACK_ADDRESSES: { id: string; label: string; line: string }[] = [
  { id: 'addr-1', label: 'Home', line: 'Block CD, Sector 1, Salt Lake, Kolkata 700064' },
  { id: 'addr-2', label: 'Office', line: 'Infinity Benchmark, Sector V, Salt Lake, Kolkata 700091' },
];

const QUICK_PRESETS = [
  { name: 'Salt Lake, Sector 1', pincode: '700064' },
  { name: 'Sector V, Salt Lake', pincode: '700091' },
  { name: 'New Town, Action Area 1', pincode: '700156' },
  { name: 'Howrah Station Area', pincode: '711101' },
];

export const CustomerLocationSelector: React.FC = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [selectedLocation, setSelectedLocation] = React.useState<string>('Salt Lake, Sector 1');
  const [addresses, setAddresses] = React.useState<CustomerAddressDTO[]>([]);
  const [detecting, setDetecting] = React.useState<boolean>(false);
  const [detectError, setDetectError] = React.useState<string | null>(null);

  // Manual entry form state
  const [manualStreet, setManualStreet] = React.useState<string>('');
  const [manualArea, setManualArea] = React.useState<string>('');
  const [manualCity, setManualCity] = React.useState<string>('Kolkata');
  const [manualPincode, setManualPincode] = React.useState<string>('');
  const [manualError, setManualError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'detect' | 'manual'>('detect');

  // Initialize selected location from localStorage on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('selected_delivery_location');
    if (saved) {
      setSelectedLocation(saved);
    }

    const fetchSavedAddresses = async () => {
      try {
        const res = await apiFetch<CustomerAddressDTO[]>('/customer/addresses');
        if (res && res.length > 0) {
          setAddresses(res);
          if (!saved) {
            const def = res.find((a) => a.isDefault) || res[0];
            const locName = `${def.city}, ${def.addressLine1.split(',')[0]}`;
            setSelectedLocation(locName);
            localStorage.setItem('selected_delivery_location', locName);
          }
        }
      } catch {
        // Fallback silently
      }
    };

    fetchSavedAddresses();
  }, []);

  const handleSelectAddress = (locName: string) => {
    setSelectedLocation(locName);
    localStorage.setItem('selected_delivery_location', locName);
    setDetectError(null);
    setIsOpen(false);
  };

  const handleDetectLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setDetectError('Geolocation is not supported by your browser.');
      return;
    }

    setDetecting(true);
    setDetectError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);

          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
              signal: controller.signal,
              headers: { 'Accept-Language': 'en' },
            },
          );
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            const suburb =
              data.address?.suburb ||
              data.address?.neighbourhood ||
              data.address?.residential ||
              data.address?.road ||
              'Current Location';
            const city =
              data.address?.city ||
              data.address?.town ||
              data.address?.city_district ||
              data.address?.state_district ||
              'Kolkata';

            const locString = `${suburb}, ${city}`;
            handleSelectAddress(locString);
          } else {
            handleSelectAddress(`Current Location (${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E)`);
          }
        } catch {
          // Graceful fallback
          handleSelectAddress('Salt Lake, Sector 1 (Detected)');
        } finally {
          setDetecting(false);
        }
      },
      (err) => {
        setDetecting(false);
        if (err.code === err.PERMISSION_DENIED) {
          setDetectError('Location permission denied. Please allow access or enter address manually.');
        } else {
          handleSelectAddress('Salt Lake, Sector 1 (Default Hub)');
        }
      },
      { timeout: 8000, enableHighAccuracy: false },
    );
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualArea.trim()) {
      setManualError('Please provide an area or locality name.');
      return;
    }

    setManualError(null);
    const parts = [
      manualStreet.trim(),
      manualArea.trim(),
      manualCity.trim(),
      manualPincode.trim(),
    ].filter(Boolean);

    const formatted = parts.join(', ');
    handleSelectAddress(formatted || `${manualArea}, ${manualCity}`);
  };

  const handleApplyPreset = (preset: { name: string; pincode: string }) => {
    setManualArea(preset.name);
    setManualPincode(preset.pincode);
    handleSelectAddress(`${preset.name}, ${preset.pincode}`);
  };

  const displayList =
    addresses.length > 0
      ? addresses.map((a) => ({
          id: a.id,
          label: a.label,
          line: `${a.addressLine1}, ${a.city} ${a.postalCode}`,
        }))
      : FALLBACK_ADDRESSES;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-[10px] border border-[#EBECEF] bg-white px-2.5 py-1 text-left hover:border-[#14B8A6] hover:bg-[#F0FDFA] transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#14B8A6] shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
          title="Change delivery location"
          aria-label="Delivery location selector"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#F0FDFA] text-[#0D5C5A]">
            <MapPin className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider leading-none">
              Deliver to
            </span>
            <span className="font-display text-[13px] font-bold text-[#0F172A] leading-tight truncate max-w-[130px] sm:max-w-[200px]">
              {selectedLocation}
            </span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Choose Delivery Location</SheetTitle>
          <SheetDescription>
            Select your location to view genuine medicine inventory and live delivery timings.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 pt-2">
          {/* Active Location Indicator Card */}
          <div className="p-3.5 rounded-[12px] bg-[#F8F9FA] border border-[#EBECEF] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                Currently Selected
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#047857] bg-[#CCFBF1] px-2 py-0.5 rounded-full">
                <Check className="h-3 w-3" />
                Active
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-[#0D5C5A]">
              <MapPin className="h-4 w-4 shrink-0 text-[#0D5C5A]" />
              <span className="truncate">{selectedLocation}</span>
            </div>
          </div>

          {/* Two Primary Choices Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-[10px] bg-[#F1F5F9] border border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setActiveTab('detect')}
              className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-[8px] transition-all cursor-pointer ${
                activeTab === 'detect'
                  ? 'bg-white text-[#0D5C5A] shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Navigation className="h-3.5 w-3.5" />
              <span>Detect Location</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-[8px] transition-all cursor-pointer ${
                activeTab === 'manual'
                  ? 'bg-white text-[#0D5C5A] shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Enter Manually</span>
            </button>
          </div>

          {/* Option 1: Detect Location Pane */}
          {activeTab === 'detect' && (
            <div className="p-4 rounded-[14px] border border-[#EBECEF] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-[10px] bg-[#F0FDFA] flex items-center justify-center text-[#0D5C5A] shrink-0">
                  <Compass className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-display text-sm font-bold text-[#0F172A]">
                    Automated GPS Geocoding
                  </h4>
                  <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                    Instantly pinpoint your current address using browser GPS and street reverse geocoding.
                  </p>
                </div>
              </div>

              {detectError && (
                <div className="p-2.5 rounded-[8px] bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626]">
                  {detectError}
                </div>
              )}

              <Button
                type="button"
                onClick={handleDetectLocation}
                disabled={detecting}
                className="w-full bg-[#0D5C5A] hover:bg-[#0A4846] text-white rounded-[10px] h-10 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {detecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Detecting GPS Location...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="h-4 w-4 text-white" />
                    <span>Detect My Current Location</span>
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Option 2: Enter Manually Pane */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="p-4 rounded-[14px] border border-[#EBECEF] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-3">
              <div className="flex items-start gap-3 mb-1">
                <div className="h-10 w-10 rounded-[10px] bg-[#F0FDFA] flex items-center justify-center text-[#0D5C5A] shrink-0">
                  <Building className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-display text-sm font-bold text-[#0F172A]">
                    Enter Delivery Address
                  </h4>
                  <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                    Specify your street, apartment, or select an express delivery hub.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-[#475569] block mb-1">
                    Area / Locality / Landmark *
                  </label>
                  <Input
                    value={manualArea}
                    onChange={(e) => setManualArea(e.target.value)}
                    placeholder="e.g. Salt Lake Sector 1, City Centre"
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#475569] block mb-1">
                    Flat / House No / Street (Optional)
                  </label>
                  <Input
                    value={manualStreet}
                    onChange={(e) => setManualStreet(e.target.value)}
                    placeholder="e.g. Block CD, House #14"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-[#475569] block mb-1">
                      City
                    </label>
                    <Input
                      value={manualCity}
                      onChange={(e) => setManualCity(e.target.value)}
                      placeholder="Kolkata"
                      className="h-9 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#475569] block mb-1">
                      Pincode
                    </label>
                    <Input
                      value={manualPincode}
                      onChange={(e) => setManualPincode(e.target.value)}
                      placeholder="700064"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Quick preset chips */}
              <div className="pt-1">
                <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider block mb-1.5">
                  Popular Hub Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-[#F8FAFC] hover:bg-[#F0FDFA] hover:text-[#0D5C5A] border border-[#E2E8F0] text-[#475569] transition-colors cursor-pointer"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {manualError && (
                <p className="text-[11px] text-[#DC2626] font-medium">{manualError}</p>
              )}

              <Button
                type="submit"
                className="w-full bg-[#0D5C5A] hover:bg-[#0A4846] text-white rounded-[10px] h-10 text-xs sm:text-sm font-semibold cursor-pointer shadow-xs mt-2"
              >
                Apply Delivery Address
              </Button>
            </form>
          )}

          {/* Saved Addresses Section */}
          <div className="space-y-2.5 pt-2 border-t border-[#EBECEF]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0F172A] font-display uppercase tracking-wider">
                Saved Addresses
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.push('/customer/addresses');
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0D5C5A] hover:underline cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                <span>Add New</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {displayList.map((addr) => {
                const shortLoc = `${addr.label} (${addr.line.split(',')[0]})`;
                const isSelected =
                  selectedLocation.includes(addr.label) || selectedLocation === addr.line;

                return (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => handleSelectAddress(shortLoc)}
                    className={`w-full flex items-start justify-between p-3 rounded-[12px] border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#0D5C5A] bg-[#F0FDFA]'
                        : 'border-[#EBECEF] bg-white hover:border-[#CBD5E1] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 max-w-[320px]">
                      <MapPin
                        className={`h-4 w-4 mt-0.5 shrink-0 ${
                          isSelected ? 'text-[#0D5C5A]' : 'text-slate-400'
                        }`}
                      />
                      <div>
                        <span className="text-xs font-bold text-[#0F172A] block leading-tight">
                          {addr.label}
                        </span>
                        <span className="text-[11px] text-[#64748B] block truncate mt-0.5 leading-tight">
                          {addr.line}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0D5C5A] text-white shrink-0 mt-0.5">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
