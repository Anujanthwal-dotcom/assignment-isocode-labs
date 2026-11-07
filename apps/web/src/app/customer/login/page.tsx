'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { PhoneLoginForm } from '@/components/auth/PhoneLoginForm';
import { OtpVerificationForm } from '@/components/auth/OtpVerificationForm';
export default function CustomerLoginPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = React.useState('');
  const [devOtp, setDevOtp] = React.useState<string | undefined>();

  const handlePhoneSuccess = (phoneNumber: string, developmentOtp?: string) => {
    setPhone(phoneNumber);
    setDevOtp(developmentOtp);
    setStep('otp');
  };

  const handleOtpSuccess = () => {
    router.replace('/customer');
  };

  return (
    <div className="w-full max-w-md">
      <Card className="shadow-lg border-slate-200">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            Customer Portal Sign In
          </CardTitle>
          <CardDescription className="text-sm text-slate-500 mt-1">
            {step === 'phone'
              ? 'Enter your mobile number to receive a secure login code'
              : 'Enter the verification code sent to your phone'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === 'phone' ? (
            <PhoneLoginForm onSuccess={handlePhoneSuccess} />
          ) : (
            <OtpVerificationForm
              phone={phone}
              initialDevOtp={devOtp}
              onBack={() => setStep('phone')}
              onSuccess={handleOtpSuccess}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
