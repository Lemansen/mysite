import type { Metadata } from 'next';
import Provider from '../components/Provider';
import Header from '../components/Header';
import { SITE } from '../lib/config';
import './globals.css';

export const metadata: Metadata = { title: `${SITE.name} — правила, команды, промокоды` };
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' as const };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Geologica:wght@500;700&family=Onest:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Provider><Header />{children}<footer className="foot">{SITE.disclaimer}</footer></Provider>
      </body>
    </html>
  );
}
