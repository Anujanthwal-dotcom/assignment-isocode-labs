import * as React from 'react';
import { Badge, type BadgeProps } from '@/components/ui/badge';

export type StatusType =
  | 'success'
  | 'warning'
  | 'danger'
  | 'information'
  | 'neutral'
  | 'completed'
  | 'pending'
  | 'processing'
  | 'verified'
  | 'rejected'
  | 'blocked';

export interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  className,
}) => {
  let variant: NonNullable<BadgeProps['variant']> = 'neutral';
  let defaultLabel: string = status;

  switch (status) {
    case 'success':
    case 'completed':
    case 'verified':
      variant = 'success';
      defaultLabel = status === 'completed' ? 'Completed' : status === 'verified' ? 'Verified' : 'Success';
      break;
    case 'warning':
    case 'pending':
    case 'processing':
      variant = 'warning';
      defaultLabel = status === 'pending' ? 'Pending Review' : status === 'processing' ? 'Processing' : 'Warning';
      break;
    case 'danger':
    case 'rejected':
    case 'blocked':
      variant = 'danger';
      defaultLabel = status === 'blocked' ? 'Blocked' : status === 'rejected' ? 'Rejected' : 'Action Required';
      break;
    case 'information':
      variant = 'information';
      defaultLabel = 'Information';
      break;
    case 'neutral':
    default:
      variant = 'neutral';
      defaultLabel = 'Draft';
      break;
  }

  return (
    <Badge variant={variant} className={className}>
      {label || defaultLabel}
    </Badge>
  );
};
