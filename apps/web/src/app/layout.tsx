import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const SFPro = localFont({
  src: '../../public/fonts/SF-Pro.ttf',
  variable: '--font-sf-pro',
})

export const metadata: Metadata = {
  title: "Vaulty",
  description:
    "Your local-first scrapbook for screenshots, notes, links, and reminders",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${SFPro.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
