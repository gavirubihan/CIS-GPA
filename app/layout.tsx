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
  title: 'CIS Results Portal | Sabaragamuwa University',
  description: 'Department of Computing & Information Systems — Student Results & GPA Calculator Portal. View your grades, calculate GPA and FGPA, and track your degree progress.',
  keywords: ['GPA Calculator', 'FGPA Calculator', 'Sabaragamuwa University', 'CIS Results', 'Information Systems GPA', 'University GPA', 'Degree Class', 'First Class Honours'],
  authors: [{ name: 'Department of Computing & Information Systems' }],
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
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('gpa_calc_theme_v3');
                if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${inter.className} min-h-screen antialiased selection:bg-indigo-500 selection:text-white`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
