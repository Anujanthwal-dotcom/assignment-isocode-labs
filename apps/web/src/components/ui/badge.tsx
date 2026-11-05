import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center justify-center h-[24px] px-[8px] rounded-[6px] text-[12px] leading-[16px] font-medium border transition-colors select-none',
  {
    variants: {
      variant: {
        success: 'bg-[#E8F8EC] text-[#0FAC26] border-[#B0E6BC]',
        warning: 'bg-[#FFF8EC] text-[#A66B16] border-[#F6DCB0]',
        danger: 'bg-[#FDF2F2] text-[#DC3545] border-[#F9CACA]',
        information: 'bg-[#EBF9FD] text-[#0088AA] border-[#B4EDFB]',
        neutral: 'bg-[#EFF2F7] text-[#6C757D] border-[#DFE0DF]',
        purple: 'bg-[#F7F5FD] text-[#6240E8] border-[#D6D1F7]',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export const Badge: React.FC<BadgeProps> = ({ className, variant, ...props }) => {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
};
Badge.displayName = 'Badge';
