import type { Metadata } from 'next';
import { Lexend, Inter, Noto_Sans_Bengali, Noto_Sans_Devanagari } from 'next/font/google';
import { AuthProvider } from '@/lib/auth/auth-context';
import './globals.css';

const lexend = Lexend({
  subsets: ['latin'],
  variable: '--font-lexend',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const notoSansBengali = Noto_Sans_Bengali({
  subsets: ['bengali'],
  variable: '--font-noto-bengali',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  variable: '--font-noto-devanagari',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Pharmacy Platform | Teladoc Health UI',
  description: 'Enterprise pharmacy management, clinical coordination, and compliance platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${lexend.variable} ${inter.variable} ${notoSansBengali.variable} ${notoSansDevanagari.variable} antialiased min-h-screen bg-[var(--background)] text-[var(--foreground)]`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
