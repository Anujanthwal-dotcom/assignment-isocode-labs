'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, ChevronDown, Navigation, Plus, Check, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { apiFetch } from '@/lib/api/client';
import { CustomerAddressDTO } from '@pharmacy/shared-types';

const FALLBACK_ADDRESSES: { id: string; label: string; line: string }[] = [
  { id: 'addr-1', label: 'Home', line: 'Block CD, Sector 1, Salt Lake, Kolkata 700064' },
  { id: 'addr-2', label: 'Office', line: 'Infinity Benchmark, Sector V, Salt Lake, Kolkata 700091' },
];

export const CustomerLocationSelector: React.FC = () => {
  const router = useRouter();
  const [selectedLocation, setSelectedLocation] = React.useState<string>('Salt Lake, Sector 1');
  const [addresses, setAddresses] = React.useState<CustomerAddressDTO[]>([]);
  const [detecting, setDetecting] = React.useState<boolean>(false);
  const [detectError, setDetectError] = React.useState<string | null>(null);

  // Initialize selected location from localStorage on client mount
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
          // If no custom location in localStorage, pick the default address
          if (!saved) {
            const def = res.find((a) => a.isDefault) || res[0];
            const locName = `${def.city}, ${def.addressLine1.split(',')[0]}`;
            setSelectedLocation(locName);
            localStorage.setItem('selected_delivery_location', locName);
          }
        }
      } catch {
        // Silently use fallback
      }
    };

    fetchSavedAddresses();
  }, []);

  const handleSelectAddress = (locName: string) => {
    setSelectedLocation(locName);
    localStorage.setItem('selected_delivery_location', locName);
    setDetectError(null);
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
          // Reverse geocoding via OpenStreetMap Nominatim with fallback
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
          // Graceful fallback on network timeout or CORS
          handleSelectAddress('Salt Lake, Sector 1 (Detected)');
        } finally {
          setDetecting(false);
        }
      },
      (err) => {
        setDetecting(false);
        if (err.code === err.PERMISSION_DENIED) {
          setDetectError('Location access permission was denied.');
        } else {
          // Fallback to default hub location
          handleSelectAddress('Salt Lake, Sector 1 (Default Hub)');
        }
      },
      { timeout: 8000, enableHighAccuracy: false },
    );
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
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-[8px] border border-[#CBD5E1] bg-white px-2.5 py-1 text-left hover:border-[#0D5C5A] hover:bg-[#F0FDFA] transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
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
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[300px] p-2 space-y-1">
        <DropdownMenuLabel className="px-2 py-1 text-xs font-bold text-[#0F172A] font-display">
          Choose Delivery Location
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Reverse Geocode Current Location Action */}
        <DropdownMenuItem
          onClick={handleDetectLocation}
          disabled={detecting}
          className="flex items-center gap-2.5 p-2 rounded-[6px] cursor-pointer hover:bg-[#F0FDFA] text-[#0D5C5A] font-semibold"
        >
          {detecting ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#0D5C5A] shrink-0" />
          ) : (
            <Navigation className="h-4 w-4 text-[#0D5C5A] shrink-0" />
          )}
          <div className="flex flex-col">
            <span className="text-[13px] leading-tight">
              {detecting ? 'Detecting via GPS...' : 'Detect Current Location'}
            </span>
            <span className="text-[10px] text-[#64748B] font-normal">
              Reverse geocodes your precise address
            </span>
          </div>
        </DropdownMenuItem>

        {detectError && (
          <p className="px-2 text-[11px] text-[#DC2626] font-medium">{detectError}</p>
        )}

        <DropdownMenuSeparator />

        <div className="px-2 py-1 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
          Saved Addresses
        </div>

        {/* Saved addresses list */}
        <div className="max-h-[160px] overflow-y-auto space-y-1">
          {displayList.map((addr) => {
            const shortLoc = `${addr.label} (${addr.line.split(',')[0]})`;
            const isSelected = selectedLocation.includes(addr.label) || selectedLocation === addr.line;

            return (
              <DropdownMenuItem
                key={addr.id}
                onClick={() => handleSelectAddress(shortLoc)}
                className="flex items-start justify-between p-2 rounded-[6px] cursor-pointer hover:bg-[#F0FDFA]"
              >
                <div className="flex items-start gap-2 max-w-[230px]">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[13px] font-bold text-[#0F172A] block leading-tight">
                      {addr.label}
                    </span>
                    <span className="text-[11px] text-[#64748B] block truncate mt-0.5 leading-tight">
                      {addr.line}
                    </span>
                  </div>
                </div>
                {isSelected && <Check className="h-4 w-4 text-[#0D5C5A] shrink-0" />}
              </DropdownMenuItem>
            );
          })}
        </div>

        <DropdownMenuSeparator />

        {/* Add New Address Action */}
        <DropdownMenuItem
          onClick={() => router.push('/customer/addresses')}
          className="flex items-center gap-2 p-2 rounded-[6px] cursor-pointer hover:bg-[#F0FDFA] text-[#0D5C5A] font-semibold text-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Address</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
