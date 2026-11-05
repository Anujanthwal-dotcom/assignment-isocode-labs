import { notFound } from 'next/navigation';
import { DesignSystemShowcase } from '@/components/design-system/DesignSystemShowcase';

export const metadata = {
  title: 'Quiet Confidence — Design System Showcase',
  description: 'Internal design system reference and interactive token specifications',
};

export default function DesignSystemPage() {
  // Server-side check: Block access in production by returning 404
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <DesignSystemShowcase />;
}
