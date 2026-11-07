import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const alertVariants = cva(
  'relative w-full rounded-[12px] p-[16px] border border-l-4 transition-all [&>svg]:absolute [&>svg]:left-[16px] [&>svg]:top-[16px] [&>svg]:text-current [&>svg~*]:pl-[28px]',
  {
    variants: {
      variant: {
        success: 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0] border-l-[#059669]',
        warning: 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A] border-l-[#D97706]',
        error: 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA] border-l-[#DC2626]',
        information: 'bg-[#F0FDFA] text-[#0F172A] border-[#99F6E4] border-l-[#0D5C5A]',
      },
    },
    defaultVariants: {
      variant: 'information',
    },
  },
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, ...props }, ref) => (
    <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
  ),
);
Alert.displayName = 'Alert';

export const AlertTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn(
      'mb-1 text-[15px] leading-[22px] font-bold tracking-tight text-current font-display',
      className,
    )}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

export const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('text-[14px] leading-[20px] opacity-95', className)} {...props} />
));
AlertDescription.displayName = 'AlertDescription';
