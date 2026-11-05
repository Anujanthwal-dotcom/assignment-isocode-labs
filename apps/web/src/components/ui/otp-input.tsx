'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface OtpInputProps {
  length?: number;
  value?: string;
  onChange?: (val: string) => void;
  disabled?: boolean;
  error?: string | boolean;
  className?: string;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value = '',
  onChange,
  disabled = false,
  error,
  className,
}) => {
  const [internalOtp, setInternalOtp] = React.useState<string[]>(
    Array(length)
      .fill('')
      .map((_, i) => value[i] || ''),
  );
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  React.useEffect(() => {
    setInternalOtp(
      Array(length)
        .fill('')
        .map((_, i) => value[i] || ''),
    );
  }, [value, length]);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.slice(-1);
    const newOtp = [...internalOtp];
    newOtp[index] = val;
    setInternalOtp(newOtp);
    onChange?.(newOtp.join(''));

    if (val && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !internalOtp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const hasError = Boolean(error);
  const errorMessage = typeof error === 'string' ? error : undefined;

  return (
    <div className={cn('space-y-[6px]', className)}>
      <div className="flex items-center gap-2">
        {Array.from({ length }).map((_, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            disabled={disabled}
            value={internalOtp[index]}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className={cn(
              'h-[44px] w-[40px] text-center rounded-[8px] bg-white text-[16px] font-semibold text-[#351F65] border border-[#CED4DA] transition-colors',
              'focus-visible:outline-none focus-visible:border-[#6240E8] focus-visible:ring-2 focus-visible:ring-[#6240E8]/20',
              hasError && 'border-[#DC3545] focus-visible:border-[#DC3545]',
              disabled && 'opacity-50 cursor-not-allowed bg-[#EFF2F7]',
            )}
            aria-label={`Digit ${index + 1}`}
          />
        ))}
      </div>
      {hasError && errorMessage && (
        <p className="text-[12px] leading-[16px] text-[#DC3545] font-normal">{errorMessage}</p>
      )}
    </div>
  );
};
OtpInput.displayName = 'OtpInput';
