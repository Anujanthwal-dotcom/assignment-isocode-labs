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
            'min-h-[100px] w-full rounded-[8px] bg-white p-[12px] text-[14px] leading-[20px] text-[#24332E] border placeholder:text-[#A4B0A8] transition-colors',
            'border-[#D3DBD5]',
            'focus-visible:outline-none focus-visible:border-[#23845D] focus-visible:ring-2 focus-visible:ring-[#23845D]/20',
            hasError && 'border-[#C44747] focus-visible:border-[#C44747] focus-visible:ring-[#C44747]/20',
            disabled && 'opacity-50 cursor-not-allowed bg-[#F0F3F1]',
            readOnly && 'bg-[#F7F9F7] cursor-default',
            className
          )}
          {...props}
        />
        {hasError && errorMessage && (
          <p className="text-[12px] leading-[16px] text-[#C44747] font-normal">{errorMessage}</p>
        )}
        {!hasError && helperText && (
          <p className="text-[12px] leading-[16px] text-[#64736C] font-normal">{helperText}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
