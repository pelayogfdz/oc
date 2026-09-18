
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SWCleaner from "./components/SWCleaner";
import PWAUpdater from "./components/PWAUpdater";
import { CorporateToastProvider } from "./components/ui/CorporateToast";
import { getTenantSettings } from "./actions/settings";

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
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/icon-192x192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#8b5cf6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let timezone = 'America/Mexico_City';
  try {
    const tenantSettings = await getTenantSettings();
    if (tenantSettings && (tenantSettings as any).timezone) {
      timezone = (tenantSettings as any).timezone;
    }
  } catch (e) {
    // Fail-safe default timezone when not authenticated (e.g. login page)
  }

  return (
    <html
      lang="es"
      translate="no"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased notranslate`}
    >
      <head>
        <meta name="google" content="notranslate" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Defensive DOM shield: Prevents Google Translate, browser extensions (Grammarly, password managers)
              // and DOM mutations from crashing React with "Failed to execute 'removeChild' on 'Node'"
              if (typeof Node === 'function' && Node.prototype) {
                var origRemoveChild = Node.prototype.removeChild;
                Node.prototype.removeChild = function(child) {
                  if (child && child.parentNode !== this) {
                    if (typeof console !== 'undefined') {
                      console.warn('[DOM SHIELD] Blocked removeChild from mismatched parent', child, this);
                    }
                    return child;
                  }
                  return origRemoveChild.apply(this, arguments);
                };

                var origInsertBefore = Node.prototype.insertBefore;
                Node.prototype.insertBefore = function(newNode, referenceNode) {
                  if (referenceNode && referenceNode.parentNode !== this) {
                    if (typeof console !== 'undefined') {
                      console.warn('[DOM SHIELD] Blocked insertBefore with mismatched referenceNode', referenceNode, this);
                    }
                    return newNode;
                  }
                  return origInsertBefore.apply(this, arguments);
                };
              }

              // Force configured timezone globally in client rendering
              (function() {
                const originalToLocaleDateString = Date.prototype.toLocaleDateString;
                Date.prototype.toLocaleDateString = function(locale, options) {
                  const opts = options || {};
                  if (!opts.timeZone) opts.timeZone = '${timezone}';
                  return originalToLocaleDateString.call(this, locale || 'es-MX', opts);
                };

                const originalToLocaleString = Date.prototype.toLocaleString;
                Date.prototype.toLocaleString = function(locale, options) {
                  const opts = options || {};
                  if (!opts.timeZone) opts.timeZone = '${timezone}';
                  return originalToLocaleString.call(this, locale || 'es-MX', opts);
                };

                const originalToLocaleTimeString = Date.prototype.toLocaleTimeString;
                Date.prototype.toLocaleTimeString = function(locale, options) {
                  const opts = options || {};
                  if (!opts.timeZone) opts.timeZone = '${timezone}';
                  return originalToLocaleTimeString.call(this, locale || 'es-MX', opts);
                };
              })();

              // Auto-recover and purge caches on Server Action mismatch or dynamic chunk loading error
              function purgeAndHardReload() {
                try {
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(function(regs) {
                      regs.forEach(function(r) { r.unregister(); });
                    });
                  }
                  if (typeof caches !== 'undefined') {
                    caches.keys().then(function(keys) {
                      keys.forEach(function(k) { caches.delete(k); });
                    });
                  }
                  sessionStorage.clear();
                } catch (e) {}

                var target = window.location.pathname.indexOf('/ventas') > -1 
                  ? window.location.pathname + '?force=' + Date.now()
                  : '/ventas/nueva?force=' + Date.now();
                window.location.replace(target);
              }

              // Monkey-patch window.alert to auto-recover on Server Action mismatch
              (function() {
                var originalAlert = window.alert;
                window.alert = function(msg) {
                  if (msg && typeof msg === 'string' && (
                    msg.indexOf('was not found on the server') > -1 ||
                    msg.indexOf('failed-to-find-server-action') > -1 ||
                    msg.indexOf('Server Action') > -1 ||
                    msg.indexOf('deployment') > -1
                  )) {
                    console.error('Server Action mismatch detected in alert. Purging caches and reloading...');
                    var lastReload = localStorage.getItem('caanma_last_reload');
                    var now = Date.now();
                    if (!lastReload || now - parseInt(lastReload) > 10000) {
                      localStorage.setItem('caanma_last_reload', now.toString());
                      purgeAndHardReload();
                    }
                    return;
                  }
                  return originalAlert.apply(this, arguments);
                };
              })();

              window.addEventListener('error', function(e) {
                if (e.target && e.target.tagName === 'IMG') {
                  e.target.style.display = 'none';
                  return;
                }
                
                var isScriptError = e.target && e.target.tagName === 'SCRIPT';
                var msg = e.message || '';
                var isChunkError = msg && (
                  msg.indexOf('ChunkLoadError') > -1 || 
                  msg.indexOf('Loading chunk') > -1 ||
                  msg.indexOf('failed to fetch') > -1 ||
                  msg.indexOf('Server Action') > -1 ||
                  msg.indexOf('failed-to-find-server-action') > -1 ||
                  msg.indexOf('was not found on the server') > -1
                );
                
                if (isScriptError || isChunkError) {
                  console.error('Critical script or chunk error detected. Purging caches and reloading...');
                  var lastReload = localStorage.getItem('caanma_last_reload');
                  var now = Date.now();
                  if (!lastReload || now - parseInt(lastReload) > 10000) {
                    localStorage.setItem('caanma_last_reload', now.toString());
                    purgeAndHardReload();
                  }
                }
              }, true);

              window.addEventListener('unhandledrejection', function(e) {
                var reason = e.reason && (e.reason.message || e.reason);
                var reasonStr = typeof reason === 'string' ? reason : '';
                if (reasonStr && (
                  reasonStr.indexOf('ChunkLoadError') > -1 || 
                  reasonStr.indexOf('Loading chunk') > -1 ||
                  reasonStr.indexOf('failed to fetch') > -1 ||
                  reasonStr.indexOf('was not found on the server') > -1 ||
                  reasonStr.indexOf('failed-to-find-server-action') > -1 ||
                  reasonStr.indexOf('Server Action') > -1 ||
                  reasonStr.indexOf('deployment') > -1
                )) {
                  console.error('Critical dynamic chunk or server action error. Purging caches and reloading...');
                  var lastReload = localStorage.getItem('caanma_last_reload');
                  var now = Date.now();
                  if (!lastReload || now - parseInt(lastReload) > 10000) {
                    localStorage.setItem('caanma_last_reload', now.toString());
                    purgeAndHardReload();
                  }
                }
              });
            `
          }}
        />
      </head>
      <body className="min-h-full flex flex-col notranslate" translate="no">
        <SWCleaner />
        <PWAUpdater />
        <CorporateToastProvider>
          {children}
        </CorporateToastProvider>
      </body>
    </html>
  );
}
