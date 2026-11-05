import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-[8px] text-[14px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#23845D] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-[#176B52] text-white hover:bg-[#125840] active:bg-[#104735]',
        secondary:
          'bg-[#E9F3EE] text-[#176B52] hover:bg-[#D4E8DC] active:bg-[#B2D6C3]',
        outline:
          'bg-white border border-[#E5EAE6] text-[#24332E] hover:bg-[#F7F9F7] active:bg-[#F0F3F1]',
        ghost:
          'bg-transparent text-[#24332E] hover:bg-[#F0F3F1] active:bg-[#E5EAE6]',
        destructive:
          'bg-[#C44747] text-white hover:bg-[#b03b3b] active:bg-[#993333]',
      },
      size: {
        sm: 'h-[32px] px-[12px] text-[14px] leading-[20px]',
        md: 'h-[40px] px-[16px] text-[14px] leading-[20px]',
        lg: 'h-[48px] px-[20px] text-[14px] leading-[20px]',
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
