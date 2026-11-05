import * as React from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, Info } from 'lucide-react';
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
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'error':
        return <AlertOctagon className="h-5 w-5" />;
      case 'information':
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  return (
    <Alert variant={type} className={className}>
      {getIcon()}
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
