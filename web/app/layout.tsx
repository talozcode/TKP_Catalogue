import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { ToastViewport } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: 'Product Catalogue',
  description: 'Build, save, and export product catalogues from Google Sheets.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
        <ToastViewport />
      </body>
    </html>
  );
}
