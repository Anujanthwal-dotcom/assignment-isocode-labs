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
        <SheetHeader className="pb-3 border-b border-[#EBECEF]">
          <SheetTitle>Delivery Location</SheetTitle>
          <SheetDescription>
            Choose your location for genuine medicine availability and express dispatch.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 pt-4">
          {/* Option 1: Detect My Location Button */}
          <div className="space-y-1.5">
            <Button
              type="button"
              onClick={handleDetectLocation}
              disabled={detecting}
              className="w-full bg-[#F0FDFA] hover:bg-[#CCFBF1] text-[#0D5C5A] border border-[#99F6E4] rounded-[10px] h-12 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
            >
              {detecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-[#0D5C5A]" />
                  <span>Detecting GPS Location...</span>
                </>
              ) : (
                <>
                  <Navigation className="h-4 w-4 text-[#0D5C5A]" />
                  <span>Detect My Location</span>
                </>
              )}
            </Button>
            {detectError && (
              <p className="text-xs text-[#DC2626] font-medium px-1">{detectError}</p>
            )}
          </div>

          {/* Simple OR Divider */}
          <div className="relative flex items-center my-2">
            <div className="flex-grow border-t border-[#EBECEF]" />
            <span className="flex-shrink mx-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              OR
            </span>
            <div className="flex-grow border-t border-[#EBECEF]" />
          </div>

          {/* Option 2: Enter Address Manually Form (Directly Below) */}
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
              Enter Address Manually
            </span>

            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] font-semibold text-[#475569] block mb-1">
                  Area / Locality / Landmark *
                </label>
                <Input
                  value={manualArea}
                  onChange={(e) => setManualArea(e.target.value)}
                  placeholder="e.g. Salt Lake Sector 1, City Centre"
                  className="h-10 text-sm"
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
                  className="h-10 text-sm"
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
                    className="h-10 text-sm"
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
                    className="h-10 text-sm"
                  />
                </div>
              </div>
            </div>

            {manualError && (
              <p className="text-xs text-[#DC2626] font-medium">{manualError}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-[#0D5C5A] hover:bg-[#0A4846] text-white rounded-[10px] h-11 text-sm font-bold cursor-pointer shadow-xs mt-1"
            >
              Apply Address
            </Button>
          </form>

          {/* Saved Addresses Section */}
          <div className="space-y-2 pt-4 border-t border-[#EBECEF]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
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
                    className={`w-full flex items-start justify-between p-2.5 rounded-[10px] border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#0D5C5A] bg-[#F0FDFA]'
                        : 'border-[#EBECEF] bg-white hover:border-[#CBD5E1] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-start gap-2 max-w-[320px]">
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
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#0D5C5A] text-white shrink-0 mt-0.5">
                        <Check className="h-2.5 w-2.5" />
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
