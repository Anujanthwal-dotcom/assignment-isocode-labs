'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { StaffLoginForm } from '@/components/auth/StaffLoginForm';
import { Stethoscope } from 'lucide-react';

export default function PharmacistLoginPage() {
  return (
    <div className="w-full max-w-md">
      <Card className="shadow-lg border-slate-200">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-700">
            <Stethoscope className="h-6 w-6" />
          </div>
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
