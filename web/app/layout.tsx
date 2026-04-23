import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { ToastViewport } from '@/components/ui/Toast';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
});
const serif = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif',
  weight: ['500', '600', '700']
});

const LOGO_URL =
  'https://res.cloudinary.com/dakhwegyt/image/upload/v1776678465/kp-primary_4x_totp25.png';

export const metadata: Metadata = {
  title: 'The Kosher Place Catalogue',
  description:
    'Build, save, and export product catalogues for The Kosher Place.',
  icons: { icon: LOGO_URL, apple: LOGO_URL }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable}`}>
      <body className="font-sans">
        <Providers>{children}</Providers>
        <ToastViewport />
      </body>
    </html>
  );
}
