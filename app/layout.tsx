import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ErrorBoundary from "@/components/ErrorBoundary";
import BetaBanner from "@/components/BetaBanner";
import BetaFeedbackWidget from "@/components/BetaFeedbackWidget";
import AppShell from "@/components/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: 'Fixerator - AI Assistant for Home Improvement Projects',
    template: '%s | Fixerator',
  },
  description: 'Get instant AI-powered help with building codes, material lists, store prices, and project planning.',
  keywords: ['DIY', 'home improvement', 'building codes', 'materials list', 'AI assistant'],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://fixerator.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Fixerator',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-image.png'],
  },
  robots: { index: false, follow: false },
  icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  themeColor: '#C67B5C',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <BetaBanner />
        <ErrorBoundary>
          <AppShell>
            {children}
          </AppShell>
        </ErrorBoundary>
        <BetaFeedbackWidget />
      </body>
    </html>
  );
}
