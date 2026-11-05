import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center justify-center h-[24px] px-[8px] rounded-[6px] text-[12px] leading-[16px] font-medium border transition-colors select-none',
  {
    variants: {
      variant: {
        success: 'bg-[#E8F4ED] text-[#23845D] border-[#B9DEC9]',
        warning: 'bg-[#FFF5E5] text-[#A66B16] border-[#F0D7A8]',
        danger: 'bg-[#FCECEC] text-[#C44747] border-[#F0C2C2]',
        information: 'bg-[#EAF3FA] text-[#3477A5] border-[#C5DDEC]',
        neutral: 'bg-[#F0F3F1] text-[#64736C] border-[#E5EAE6]',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge: React.FC<BadgeProps> = ({ className, variant, ...props }) => {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
};
Badge.displayName = 'Badge';
