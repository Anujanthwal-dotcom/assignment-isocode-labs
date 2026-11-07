import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string | boolean;
  helperText?: string;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, type = 'text', error, helperText, leftIcon, disabled, readOnly, ...props },
    ref,
  ) => {
    const hasError = Boolean(error);
    const errorMessage = typeof error === 'string' ? error : undefined;

    return (
      <div className="w-full space-y-[6px]">
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-[12px] flex items-center pointer-events-none text-[#64748B]">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            disabled={disabled}
            readOnly={readOnly}
            className={cn(
              'h-[44px] w-full rounded-[12px] bg-white px-[14px] text-[14px] leading-[20px] text-[#0F172A] border placeholder:text-[#94A3B8] transition-all duration-150',
              'border-[#E2E8F0] hover:border-[#CBD5E1]',
              'focus-visible:outline-none focus-visible:border-[#0D5C5A] focus-visible:ring-2 focus-visible:ring-[#0D5C5A]/15',
              hasError &&
                'border-[#DC2626] bg-[#FEF2F2]/40 focus-visible:border-[#DC2626] focus-visible:ring-[#DC2626]/20',
              disabled && 'opacity-50 cursor-not-allowed bg-[#EFF4FF]',
              readOnly && 'bg-[#F8FAFC] cursor-default',
              leftIcon && 'pl-[38px]',
              className,
            )}
            ref={ref}
            {...props}
          />
        </div>
        {hasError && errorMessage && (
          <p className="text-[12px] leading-[16px] text-[#DC2626] font-medium flex items-center gap-1">
            {errorMessage}
          </p>
        )}
        {!hasError && helperText && (
          <p className="text-[12px] leading-[16px] text-[#64748B] font-normal">{helperText}</p>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';

export interface PasswordInputProps extends Omit<InputProps, 'type' | 'leftIcon'> {
  showToggle?: boolean;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);

    return (
      <div className="relative w-full">
        <Input
          type={showPassword ? 'text' : 'password'}
          className={cn('pr-[44px]', className)}
          ref={ref}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-[12px] top-[13px] text-xs font-semibold text-[#64748B] hover:text-[#0D5C5A] transition-colors cursor-pointer"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? 'Hide' : 'Show'}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = 'PasswordInput';

export type SearchInputProps = Omit<InputProps, 'leftIcon'>;

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, placeholder = 'Search...', ...props }, ref) => {
    return (
      <Input type="search" placeholder={placeholder} className={className} ref={ref} {...props} />
    );
  },
);
SearchInput.displayName = 'SearchInput';
