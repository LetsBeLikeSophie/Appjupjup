import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/lib/ctx';
import { TabBar, Toast } from '@/components/ui';
import { FeedbackSheet, LoginSheet } from '@/components/sheets';

export const metadata: Metadata = {
  title: '앱줍줍',
  description: '내 앱 올리고, 남의 앱 줍줍. 서로 받아보고 한 줄 피드백을 주고받는 앱 품앗이.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: '앱줍줍', statusBarStyle: 'default' },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#EDEDE9' };

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
          <TabBar />
          <LoginSheet />
          <FeedbackSheet />
          <Toast />
        </AppProvider>
      </body>
    </html>
  );
}
