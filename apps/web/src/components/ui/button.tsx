import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-[8px] text-[14px] font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#2DD4BF] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        primary:
          'bg-[#0D5C5A] text-white hover:bg-[#0A4846] active:bg-[#004341] shadow-xs active:scale-[0.99]',
        secondary:
          'bg-white text-[#0D5C5A] border border-[#0D5C5A] hover:bg-[#F0FDFA] active:bg-[#CCFBF1]',
        refill:
          'bg-[#D97706] text-white hover:bg-[#B45309] active:bg-[#92400E] shadow-xs',
        outline:
          'bg-white border border-[#CBD5E1] text-[#0F172A] hover:bg-[#F8FAFC] active:bg-[#EFF4FF]',
        ghost:
          'bg-transparent text-[#0F172A] hover:bg-[#F0FDFA] hover:text-[#0D5C5A] active:bg-[#CCFBF1]',
        destructive:
          'bg-[#DC2626] text-white hover:bg-[#B91C1C] active:bg-[#991B1B]',
        teal:
          'bg-[#14B8A6] text-white hover:bg-[#0D9488] active:bg-[#006B5F] shadow-xs',
      },
      size: {
        sm: 'h-[34px] px-[12px] text-[13px] leading-[18px]',
        md: 'h-[44px] px-[16px] text-[14px] leading-[20px]',
        lg: 'h-[48px] px-[20px] text-[15px] leading-[22px]',
        icon: 'h-[40px] w-[40px] p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
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
            <span className="mr-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>{children}</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
