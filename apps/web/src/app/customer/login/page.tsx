'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AuthSplitLayout } from '@/components/layouts/AuthSplitLayout';
import { CustomerEmailLoginForm } from '@/components/auth/CustomerEmailLoginForm';

export default function CustomerLoginPage() {
  const router = useRouter();

  const handleLoginSuccess = () => {
    router.replace('/customer');
  };

  return (
    <AuthSplitLayout
      title="Customer Portal"
      subtitle="Sign in with your email and password"
      backHref="/"
      backLabel="Back to Portals"
    >
      <CustomerEmailLoginForm onSuccess={handleLoginSuccess} />
    </AuthSplitLayout>
  );
}
