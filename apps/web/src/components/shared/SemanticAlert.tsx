import * as React from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export type AlertType = 'success' | 'warning' | 'error' | 'information';

export interface SemanticAlertProps {
  type: AlertType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const SemanticAlert: React.FC<SemanticAlertProps> = ({
  type,
  title,
  description,
  action,
  className,
}) => {
  return (
    <Alert variant={type} className={className}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <AlertTitle>{title}</AlertTitle>
          {description && <AlertDescription>{description}</AlertDescription>}
        </div>
        {action && <div className="mt-2 sm:mt-0 shrink-0">{action}</div>}
      </div>
    </Alert>
  );
};
