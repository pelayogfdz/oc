
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
                  return;
                }
                
                const isScriptError = e.target && e.target.tagName === 'SCRIPT';
                const isChunkError = e.message && (
                  e.message.indexOf('ChunkLoadError') > -1 || 
                  e.message.indexOf('Loading chunk') > -1 ||
                  e.message.indexOf('failed to fetch') > -1
                );
                
                if (isScriptError || isChunkError) {
                  console.error('Critical script or chunk error detected. Auto-reloading client...');
                  const lastReload = localStorage.getItem('caanma_last_reload');
                  const now = Date.now();
                  if (!lastReload || now - parseInt(lastReload) > 8000) {
                    localStorage.setItem('caanma_last_reload', now.toString());
                    window.location.reload();
                  }
                }
              }, true);

              window.addEventListener('unhandledrejection', function(e) {
                const reason = e.reason && e.reason.message;
                if (reason && (
                  reason.indexOf('ChunkLoadError') > -1 || 
                  reason.indexOf('Loading chunk') > -1 ||
                  reason.indexOf('failed to fetch') > -1
                )) {
                  console.error('Critical dynamic chunk promise rejection detected. Auto-reloading client...');
                  const lastReload = localStorage.getItem('caanma_last_reload');
                  const now = Date.now();
                  if (!lastReload || now - parseInt(lastReload) > 8000) {
                    localStorage.setItem('caanma_last_reload', now.toString());
                    window.location.reload();
                  }
                }
              });
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
