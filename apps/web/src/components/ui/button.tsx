import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-[8px] text-[14px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6240E8] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-[#6240E8] text-white hover:bg-[#542F9B] active:bg-[#351F65] shadow-xs',
        secondary:
          'bg-[#F7F5FD] text-[#6240E8] border border-[#EAE8F0] hover:bg-[#EAE8F0] active:bg-[#D6D1F7]',
        outline:
          'bg-white border border-[#DFE0DF] text-[#351F65] hover:bg-[#F8F9FB] active:bg-[#EFF2F7]',
        ghost:
          'bg-transparent text-[#351F65] hover:bg-[#F7F5FD] active:bg-[#EAE8F0]',
        destructive:
          'bg-[#DC3545] text-white hover:bg-[#c82333] active:bg-[#bd2130]',
        teal:
          'bg-[#00B5E2] text-white hover:bg-[#009ec5] active:bg-[#0088aa] shadow-xs',
      },
      size: {
        sm: 'h-[32px] px-[12px] text-[13px] leading-[18px]',
        md: 'h-[40px] px-[16px] text-[14px] leading-[20px]',
        lg: 'h-[48px] px-[20px] text-[15px] leading-[22px]',
        icon: 'h-[40px] w-[40px] p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading = false, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-current" />
            <span>{children}</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { buttonVariants };
