import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/lib/ctx';
import { Globals } from '@/components/globals';

export const metadata: Metadata = {
  title: '앱줍줍',
  description: '쏟아지는 작은 앱, 먼저 줍줍. 써 보고 댓글 한 줄.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: '앱줍줍', statusBarStyle: 'default' },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: 'cover', themeColor: '#F6F6F3' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap" />
      </head>
      <body>
        <AppProvider>
          <main className="frame">{children}</main>
          <Globals />
        </AppProvider>
      </body>
    </html>
  );
}
