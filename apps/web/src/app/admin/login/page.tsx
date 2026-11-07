'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { StaffLoginForm } from '@/components/auth/StaffLoginForm';
export default function AdminLoginPage() {
  return (
    <div className="w-full max-w-md">
      <Card className="shadow-lg border-slate-200">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            Operations &amp; Compliance Portal
          </CardTitle>
          <CardDescription className="text-sm text-slate-500 mt-1">
            Sign in with administrator or compliance officer credentials
          </CardDescription>
        </CardHeader>

        <CardContent>
          <StaffLoginForm
            portalTitle="Admin Portal"
            expectedRoles={['ADMIN', 'COMPLIANCE_ADMIN']}
            redirectPath="/admin"
          />
        </CardContent>
      </Card>
    </div>
  );
}
