'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { cn } from '@/lib/utils';

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & {
    error?: string | boolean;
  }
>(({ className, children, error, ...props }, ref) => {
  const hasError = Boolean(error);
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        'flex h-[44px] w-full items-center justify-between rounded-[8px] border border-[#CBD5E1] bg-white px-[12px] text-[14px] leading-[20px] text-[#0F172A] transition-all cursor-pointer',
        'hover:border-[#94A3B8] focus:outline-none focus:border-[#0D5C5A] focus:ring-3 focus:ring-[#14B8A6]/20',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#EFF4FF]',
        hasError && 'border-[#DC2626] bg-[#FEF2F2]/40 focus:border-[#DC2626] focus:ring-[#DC2626]/20',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <span className="text-[10px] text-[#64748B] select-none">▼</span>
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
});
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

export const SelectContent = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        'relative z-50 min-w-[180px] overflow-hidden rounded-[8px] border border-[#CBD5E1] bg-white p-[6px] text-[#0F172A] shadow-[0_4px_6px_-1px_rgba(13,92,90,0.04),0_10px_24px_-3px_rgba(15,23,42,0.08)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        position === 'popper' && 'data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1',
        className,
      )}
      position={position}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn(
          'p-0',
          position === 'popper' &&
            'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]',
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

export const SelectItem = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex h-[38px] w-full cursor-pointer select-none items-center rounded-[6px] px-[8px] text-[14px] text-[#0F172A] outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-[#F0FDFA] hover:text-[#0D5C5A] focus:bg-[#F0FDFA] focus:text-[#0D5C5A]',
      className,
    )}
    {...props}
  >
    <span className="absolute right-[8px] flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <span className="text-xs font-bold text-[#0D5C5A] select-none">✓</span>
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;
