'use client';

import * as React from 'react';
import Link from 'next/link';
import { Pill, User, Users, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { SAMPLE_CUSTOMER } from '@/lib/sample-data';

export const CustomerNavbar: React.FC = () => {
  const [selectedFamily, setSelectedFamily] = React.useState<string>(SAMPLE_CUSTOMER.activeProfile);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E5EAE6] bg-white">
      <div className="mx-auto flex h-[56px] sm:h-[64px] max-w-[1200px] items-center justify-between px-[16px] lg:px-[32px]">
        {/* Logo & Brand */}
        <div className="flex items-center gap-8">
          <Link href="/customer" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#176B52] text-white">
              <Pill className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[16px] font-semibold tracking-tight text-[#24332E]">
                Pharmacy
              </span>
              <span className="text-[11px] text-[#64736C] hidden sm:block">
                Customer Care
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/customer"
              className="rounded-[6px] px-3 py-1.5 text-[14px] font-medium text-[#176B52] bg-[#E9F3EE]"
            >
              Home
            </Link>
            <Link
              href="/customer"
              className="rounded-[6px] px-3 py-1.5 text-[14px] font-medium text-[#64736C] hover:text-[#24332E] hover:bg-[#F0F3F1] transition-colors"
            >
              Orders &amp; Refills
            </Link>
            <Link
              href="/customer"
              className="rounded-[6px] px-3 py-1.5 text-[14px] font-medium text-[#64736C] hover:text-[#24332E] hover:bg-[#F0F3F1] transition-colors"
            >
              Family Health
            </Link>
            <Link
              href="/customer"
              className="rounded-[6px] px-3 py-1.5 text-[14px] font-medium text-[#64736C] hover:text-[#24332E] hover:bg-[#F0F3F1] transition-colors"
            >
              Prescriptions
            </Link>
          </nav>
        </div>

        {/* Right Action: Family Selector / Profile Dropdown */}
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-[8px] border border-[#E5EAE6] bg-[#F7F9F7] px-3 py-1.5 text-[14px] font-medium text-[#24332E] hover:bg-[#F0F3F1] transition-colors focus:outline-none focus:ring-2 focus:ring-[#23845D]">
              <Users className="h-4 w-4 text-[#176B52]" />
              <span className="hidden sm:inline">Active:</span>
              <span className="font-semibold text-[#176B52]">{selectedFamily}</span>
              <ChevronDown className="h-3.5 w-3.5 text-[#64736C]" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>Switch Profile</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {SAMPLE_CUSTOMER.familyMembers.map((member) => (
                <DropdownMenuItem
                  key={member.id}
                  onClick={() => setSelectedFamily(member.relation)}
                  className="flex items-center justify-between"
                >
                  <span>{member.name}</span>
                  {selectedFamily === member.relation && (
                    <span className="h-2 w-2 rounded-full bg-[#176B52]" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#E5EAE6] bg-white text-[#24332E]">
            <User className="h-4 w-4 text-[#64736C]" />
          </div>
        </div>
      </div>
    </header>
  );
};
