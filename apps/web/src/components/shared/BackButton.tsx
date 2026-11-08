'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export interface BackButtonProps {
  /** Optional link destination. If omitted, uses browser router.back(). */
  href?: string;
  /** Button label. Defaults to 'Back'. */
  label?: string;
  /** Visual variant. Defaults to 'pill'. */
  variant?: 'pill' | 'subtle' | 'icon' | 'badge';
  /** Additional CSS classes. */
  className?: string;
  /** Optional click handler before navigation. */
  onClick?: () => void;
  /** Accessible label for screen readers (recommended for 'icon' variant). */
  ariaLabel?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({
  href,
  label = 'Back',
  variant = 'pill',
  className = '',
  onClick,
  ariaLabel,
}) => {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
    }
    if (!href) {
      e.preventDefault();
      router.back();
    }
  };

  const accessibleText = ariaLabel || label;

  let baseStyles = '';
  let content = null;

  switch (variant) {
    case 'subtle':
      baseStyles =
        'group inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#0D5C5A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D5C5A]/30 rounded';
      content = (
        <>
          <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
          <span>{label}</span>
        </>
      );
      break;

    case 'badge':
      baseStyles =
        'group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-[#F0FDFA] hover:text-[#0D5C5A] border border-slate-200 hover:border-[#99F6E4] transition-all shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D5C5A]/30';
      content = (
        <>
          <ArrowLeft className="h-3 w-3 transition-transform duration-200 group-hover:-translate-x-0.5 text-slate-500 group-hover:text-[#0D5C5A]" />
          <span>{label}</span>
        </>
      );
      break;

    case 'icon':
      baseStyles =
        'group inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-slate-600 hover:bg-slate-50 hover:text-[#0D5C5A] hover:border-[#0D5C5A]/40 transition-all shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D5C5A]/30';
      content = (
        <>
          <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          <span className="sr-only">{accessibleText}</span>
        </>
      );
      break;

    case 'pill':
    default:
      baseStyles =
        'group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-[#E2E8F0] hover:bg-slate-50 hover:text-[#0D5C5A] hover:border-[#0D5C5A]/40 transition-all shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D5C5A]/30';
      content = (
        <>
          <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5 text-slate-500 group-hover:text-[#0D5C5A]" />
          <span>{label}</span>
        </>
      );
      break;
  }

  const combinedClasses = `${baseStyles} ${className}`.trim();

  if (href) {
    return (
      <Link
        href={href}
        className={combinedClasses}
        aria-label={accessibleText}
        onClick={onClick}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={combinedClasses}
      aria-label={accessibleText}
    >
      {content}
    </button>
  );
};
