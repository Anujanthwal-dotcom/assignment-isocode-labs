'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { CustomerEmailLoginForm } from '@/components/auth/CustomerEmailLoginForm';
import { PhoneLoginForm } from '@/components/auth/PhoneLoginForm';
import { OtpVerificationForm } from '@/components/auth/OtpVerificationForm';

export default function CustomerLoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = React.useState<'email' | 'phone'>('email');
  const [otpStep, setOtpStep] = React.useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = React.useState('');
  const [devOtp, setDevOtp] = React.useState<string | undefined>();

  const handleLoginSuccess = () => {
    router.replace('/customer');
  };

  const handlePhoneSuccess = (phoneNumber: string, developmentOtp?: string) => {
    setPhone(phoneNumber);
    setDevOtp(developmentOtp);
    setOtpStep('otp');
  };

  return (
    <div className="w-full max-w-md">
      <Card className="shadow-lg border-slate-200">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            Customer Portal Sign In
          </CardTitle>
          <CardDescription className="text-sm text-slate-500 mt-1">
            {authMode === 'email'
              ? 'Sign in with your email and password'
              : otpStep === 'phone'
                ? 'Enter your mobile number to receive a secure login code'
                : 'Enter the verification code sent to your phone'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {authMode === 'email' ? (
            <>
              <CustomerEmailLoginForm onSuccess={handleLoginSuccess} />
              <div className="pt-2 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('phone');
                    setOtpStep('phone');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Need to use SMS code? Switch to Mobile OTP
                </button>
              </div>
            </>
          ) : (
            <>
              {otpStep === 'phone' ? (
                <PhoneLoginForm onSuccess={handlePhoneSuccess} />
              ) : (
                <OtpVerificationForm
                  phone={phone}
                  initialDevOtp={devOtp}
                  onBack={() => setOtpStep('phone')}
                  onSuccess={handleLoginSuccess}
                />
              )}
              <div className="pt-2 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => setAuthMode('email')}
                  className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Prefer email &amp; password? Switch to Email Login
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
