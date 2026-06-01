
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SWCleaner from "./components/SWCleaner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "CAANMA PRO",
  description: "CAANMA ERP - Desktop Offline POS",
  manifest: "/manifest.json?v=6",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CAANMA PRO",
  },
};

export const viewport: Viewport = {
  themeColor: "#8b5cf6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(e) {
                if (e.target && e.target.tagName === 'IMG') {
                  e.target.style.display = 'none';
                }
              }, true);
            `
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <SWCleaner />
        {children}
      </body>
    </html>
  );
}
