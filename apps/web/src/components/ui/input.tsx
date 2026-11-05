import * as React from 'react';
import { Eye, EyeOff, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string | boolean;
  helperText?: string;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error, helperText, leftIcon, disabled, readOnly, ...props }, ref) => {
    const hasError = Boolean(error);
    const errorMessage = typeof error === 'string' ? error : undefined;

    return (
      <div className="w-full space-y-[6px]">
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-[12px] flex items-center pointer-events-none text-[#78879A]">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            disabled={disabled}
            readOnly={readOnly}
            className={cn(
              'h-[44px] w-full rounded-[8px] bg-white px-[12px] text-[14px] leading-[20px] text-[#14161A] border placeholder:text-[#ADB5BD] transition-colors',
              'border-[#CED4DA]',
              'focus-visible:outline-none focus-visible:border-[#6240E8] focus-visible:ring-2 focus-visible:ring-[#6240E8]/20',
              hasError && 'border-[#DC3545] focus-visible:border-[#DC3545] focus-visible:ring-[#DC3545]/20',
              disabled && 'opacity-50 cursor-not-allowed bg-[#EFF2F7]',
              readOnly && 'bg-[#F8F9FB] cursor-default',
              leftIcon && 'pl-[38px]',
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
        {hasError && errorMessage && (
          <p className="text-[12px] leading-[16px] text-[#DC3545] font-normal">{errorMessage}</p>
        )}
        {!hasError && helperText && (
          <p className="text-[12px] leading-[16px] text-[#78879A] font-normal">{helperText}</p>
        )}
      </div>
    );
  }
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
          className={cn('pr-[40px]', className)}
          ref={ref}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-[12px] top-[14px] text-[#78879A] hover:text-[#351F65] transition-colors"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = 'PasswordInput';

export type SearchInputProps = Omit<InputProps, 'leftIcon'>;

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, placeholder = 'Search...', ...props }, ref) => {
    return (
      <Input
        type="search"
        leftIcon={<Search className="h-4 w-4" />}
        placeholder={placeholder}
        className={className}
        ref={ref}
        {...props}
      />
    );
  }
);
SearchInput.displayName = 'SearchInput';
