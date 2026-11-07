import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string | boolean;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, helperText, disabled, readOnly, ...props }, ref) => {
    const hasError = Boolean(error);
    const errorMessage = typeof error === 'string' ? error : undefined;

    return (
      <div className="w-full space-y-[6px]">
        <textarea
          ref={ref}
          disabled={disabled}
          readOnly={readOnly}
          className={cn(
            'min-h-[100px] w-full rounded-[8px] bg-white p-[12px] text-[14px] leading-[20px] text-[#0F172A] border placeholder:text-[#94A3B8] transition-all duration-150',
            'border-[#CBD5E1] hover:border-[#94A3B8]',
            'focus-visible:outline-none focus-visible:border-[#0D5C5A] focus-visible:ring-3 focus-visible:ring-[#14B8A6]/20',
            hasError &&
              'border-[#DC2626] bg-[#FEF2F2]/40 focus-visible:border-[#DC2626] focus-visible:ring-[#DC2626]/20',
            disabled && 'opacity-50 cursor-not-allowed bg-[#EFF4FF]',
            readOnly && 'bg-[#F8FAFC] cursor-default',
            className,
          )}
          {...props}
        />
        {hasError && errorMessage && (
          <p className="text-[12px] leading-[16px] text-[#DC2626] font-medium">{errorMessage}</p>
        )}
        {!hasError && helperText && (
          <p className="text-[12px] leading-[16px] text-[#64748B] font-normal">{helperText}</p>
        )}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';
