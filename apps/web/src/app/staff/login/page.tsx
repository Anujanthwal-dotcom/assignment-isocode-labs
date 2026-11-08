'use client';

import * as React from 'react';
import { AuthSplitLayout } from '@/components/layouts/AuthSplitLayout';
import { StaffLoginForm } from '@/components/auth/StaffLoginForm';

export default function StaffLoginPage() {
  return (
    <AuthSplitLayout
      title="Store Staff Portal"
      subtitle="Sign in to inject daily CSV inventory & manage store order fulfilment"
      backHref="/"
      backLabel="Back to Portals"
    >
      <StaffLoginForm
        portalTitle="Store Staff Portal"
        expectedRoles={['STORE_STAFF', 'PHARMACIST', 'ADMIN']}
        redirectPath="/staff"
      />
    </AuthSplitLayout>
  );
}
