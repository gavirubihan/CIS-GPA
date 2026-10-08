import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../components/AuthProvider';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://cis-gpa.netlify.app'),
  title: {
    default: 'CIS GPA Portal | BSc (Hons) CIS / IS',
    template: '%s | CIS GPA Portal',
  },
  description:
    'Department of Computing & Information Systems — Official Student Results & Weighted GPA Calculator Portal for BSc (Hons) Computing & Information Systems and Information Systems undergraduates at Sabaragamuwa University of Sri Lanka. Track semester modules, calculate weighted FGPA, and forecast degree classifications.',
  keywords: [
    'CIS GPA Calculator',
    'FGPA Calculator',
    'Sabaragamuwa University',
    'BSc Hons CIS',
    'BSc Hons Information Systems',
    'CIS Results Portal',
    'Degree Class Calculator',
    'First Class Honours',
    'SUSL Results',
    'Sri Lanka University GPA',
  ],
  authors: [{ name: 'Department of Computing & Information Systems, SUSL' }],
  creator: 'Department of Computing & Information Systems',
  publisher: 'Sabaragamuwa University of Sri Lanka',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: ['/favicon.svg'],
    apple: [
      { url: '/apple-touch-icon.svg', type: 'image/svg+xml' },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'en_LK',
    url: 'https://cis-gpa.netlify.app',
    siteName: 'CIS GPA Portal',
    title: 'CIS GPA Portal | BSc (Hons) CIS / IS — Sabaragamuwa University',
    description:
      'Official Grade Management & Weighted GPA Calculator Portal for BSc (Hons) CIS and IS undergraduates at Sabaragamuwa University of Sri Lanka. Calculate weighted FGPA, track semester modules, and plan target honors classifications.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 675,
        alt: 'CIS GPA Portal — BSc (Hons) CIS / IS Sabaragamuwa University of Sri Lanka',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CIS GPA Portal | BSc (Hons) CIS / IS',
    description:
      'Official Grade Management & Weighted GPA Calculator Portal for BSc (Hons) CIS and IS undergraduates at Sabaragamuwa University of Sri Lanka.',
    images: ['/og-image.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#090d16',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`} suppressHydrationWarning>
      <body
        className={`${inter.className} min-h-screen antialiased selection:bg-indigo-500 selection:text-white`}
        suppressHydrationWarning
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('gpa_calc_theme_v3');
                if (t === 'light') {
                  document.documentElement.classList.remove('dark');
                } else {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
