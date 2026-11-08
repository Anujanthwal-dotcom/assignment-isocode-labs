'use client';

import * as React from 'react';
import { AuthSplitLayout } from '@/components/layouts/AuthSplitLayout';
import { StaffLoginForm } from '@/components/auth/StaffLoginForm';

export default function AdminLoginPage() {
  return (
    <AuthSplitLayout
      title="Operations &amp; Compliance Portal"
      subtitle="Sign in with administrator credentials"
      backHref="/"
      backLabel="Back to Portals"
    >
      <StaffLoginForm
        portalTitle="Admin Portal"
        expectedRoles={['ADMIN']}
        redirectPath="/admin"
      />
    </AuthSplitLayout>
  );
}
