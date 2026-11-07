'use client';

import * as React from 'react';
import { AuthSplitLayout } from '@/components/layouts/AuthSplitLayout';
import { StaffLoginForm } from '@/components/auth/StaffLoginForm';

export default function PharmacistLoginPage() {
  return (
    <AuthSplitLayout
      title="Pharmacist Workspace"
      subtitle="Sign in with your pharmacy credentials to manage prescription queue"
      backHref="/"
      backLabel="Back to Portals"
    >
      <StaffLoginForm
        portalTitle="Pharmacist Portal"
        expectedRoles={['PHARMACIST']}
        redirectPath="/pharmacist"
      />
    </AuthSplitLayout>
  );
}
