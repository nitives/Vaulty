import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { MotionConfig } from "motion/react";

const SFPro = localFont({
  src: "../../public/fonts/SF-Pro.ttf",
  variable: "--font-sf-pro",
});

export const metadata: Metadata = {
  title: "Vaulty",
  description:
    "Your local-first scrapbook for screenshots, notes, links, and reminders",
};

// Blocking script to prevent theme flash on load
// Runs before React hydrates to apply saved theme immediately
// Also sets a global for React to read synchronously
// NOTE: This runs in <head> so we can only modify <html>, not <body>
const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('vaulty-settings');
    if (stored) {
      var settings = JSON.parse(stored);
      window.__VAULTY_SETTINGS__ = settings;
      var theme = settings.theme || 'system';
      var isDark = theme === 'dark' || 
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
      }
      if (settings.titlebarTransparent) {
        document.documentElement.classList.add('titlebar-transparent');
      }
      if (settings.inputBarPosition === 'top') {
        document.documentElement.classList.add('input-bar-top');
      }
      // Apply accent color
      var accentColor = settings.accentColor || 'blue';
      document.documentElement.setAttribute('data-accent', accentColor);
    } else {
      window.__VAULTY_SETTINGS__ = null;
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      }
      document.documentElement.setAttribute('data-accent', 'blue');
    }
  } catch (e) {
    window.__VAULTY_SETTINGS__ = null;
    document.documentElement.setAttribute('data-accent', 'blue');
  }
})();
`;

// Script that runs at start of body to apply transparent-mode class
// Must be separate because body doesn't exist when head scripts run
const transparencyScript = `
(function() {
  try {
    var settings = window.__VAULTY_SETTINGS__;
    if (settings && settings.transparency) {
      document.body.classList.add('transparent-mode');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <MotionConfig reducedMotion="user">
        <body
          suppressHydrationWarning
          className={`${SFPro.variable} antialiased`}
        >
          <script dangerouslySetInnerHTML={{ __html: transparencyScript }} />
          {children}
        </body>
      </MotionConfig>
    </html>
  );
}
