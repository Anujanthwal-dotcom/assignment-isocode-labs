'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { StaffLoginForm } from '@/components/auth/StaffLoginForm';
export default function PharmacistLoginPage() {
  return (
    <div className="w-full max-w-md">
      <Card className="shadow-lg border-slate-200">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            Pharmacist Workspace
          </CardTitle>
          <CardDescription className="text-sm text-slate-500 mt-1">
            Sign in with your pharmacy credentials to manage prescription queue
          </CardDescription>
        </CardHeader>

        <CardContent>
          <StaffLoginForm
            portalTitle="Pharmacist Portal"
            expectedRoles={['PHARMACIST']}
            redirectPath="/pharmacist"
          />
        </CardContent>
      </Card>
    </div>
  );
}
