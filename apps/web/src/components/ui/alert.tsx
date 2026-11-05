import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const alertVariants = cva(
  'relative w-full rounded-[8px] border p-[16px] [&>svg]:absolute [&>svg]:left-[16px] [&>svg]:top-[16px] [&>svg]:text-current [&>svg~*]:pl-[28px]',
  {
    variants: {
      variant: {
        success: 'bg-[#E8F4ED] text-[#23845D] border-[#B9DEC9]',
        warning: 'bg-[#FFF5E5] text-[#A66B16] border-[#F0D7A8]',
        error: 'bg-[#FCECEC] text-[#C44747] border-[#F0C2C2]',
        information: 'bg-[#EAF3FA] text-[#3477A5] border-[#C5DDEC]',
      },
    },
    defaultVariants: {
      variant: 'information',
    },
  }
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
);
Alert.displayName = 'Alert';

export const AlertTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 text-[14px] leading-[20px] font-semibold tracking-tight text-current', className)}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

export const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-[14px] leading-[20px] opacity-90', className)}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';
