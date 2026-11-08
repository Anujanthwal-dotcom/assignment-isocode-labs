import { StaffLayout } from '@/components/layouts/StaffLayout';

export default function StaffRootLayout({ children }: { children: React.ReactNode }) {
  return <StaffLayout>{children}</StaffLayout>;
}
