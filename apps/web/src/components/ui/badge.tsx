import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center justify-center h-[24px] px-[10px] rounded-full text-[12px] leading-[16px] font-semibold border transition-colors select-none tracking-tight',
  {
    variants: {
      variant: {
        success: 'bg-[#CCFBF1] text-[#047857] border-[#99F6E4]',
        warning: 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]',
        danger: 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]',
        information: 'bg-[#E0F2FE] text-[#0284C7] border-[#BAE6FD]',
        neutral: 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]',
        primary: 'bg-[#F0FDFA] text-[#0D5C5A] border-[#99F6E4]',
        purple: 'bg-[#EFF4FF] text-[#0284C7] border-[#BAE6FD]', // legacy backward compat
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge: React.FC<BadgeProps> = ({ className, variant, ...props }) => {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
};
Badge.displayName = 'Badge';
