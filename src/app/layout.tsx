import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import { Providers } from '@/lib/providers';
import { ConnectionErrorProvider } from '@/contexts/connection-error-context';
import ConnectionErrorOverlay from '@/components/connection/connection-error-overlay';
import { ConnectionErrorHandler } from '@/components/connection/connection-error-handler';
import './globals.css';
import PWAWrapper from '@/components/pwa/PWAWrapper';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-sans',
});

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export const metadata: Metadata = {
  title: 'Tecnicentro JR - Gestión',
  description: 'Sistema de gestión para Tecnicentro JR',
  generator: 'Next.js',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          <ConnectionErrorProvider>
            <Suspense fallback={null}>
              <PWAWrapper />
            </Suspense>
            <ConnectionErrorHandler />
            <ConnectionErrorOverlay />
            {children}
          </ConnectionErrorProvider>
        </Providers>
      </body>
    </html>
  );
}