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
            'min-h-[100px] w-full rounded-[8px] bg-white p-[12px] text-[14px] leading-[20px] text-[#14161A] border placeholder:text-[#ADB5BD] transition-colors',
            'border-[#CED4DA]',
            'focus-visible:outline-none focus-visible:border-[#6240E8] focus-visible:ring-2 focus-visible:ring-[#6240E8]/20',
            hasError &&
              'border-[#DC3545] focus-visible:border-[#DC3545] focus-visible:ring-[#DC3545]/20',
            disabled && 'opacity-50 cursor-not-allowed bg-[#EFF2F7]',
            readOnly && 'bg-[#F8F9FB] cursor-default',
            className,
          )}
          {...props}
        />
        {hasError && errorMessage && (
          <p className="text-[12px] leading-[16px] text-[#DC3545] font-normal">{errorMessage}</p>
        )}
        {!hasError && helperText && (
          <p className="text-[12px] leading-[16px] text-[#78879A] font-normal">{helperText}</p>
        )}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';
