import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Soundlink OAuth Example",
  description:
    "Reference Next.js app for Soundlink Authorization Code + PKCE account linking",
};

/*
 * The demo is light-theme only. Declaring the colour scheme stops a browser on a dark OS
 * from restyling native UI — scrollbars, focus rings, form controls — against the page.
 */
export const viewport: Viewport = {
  colorScheme: "light",
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
      {/* Colours are plain Tailwind utilities — one light palette, no variants. */}
      <body className="flex min-h-full flex-col bg-white text-neutral-900">
        {children}
      </body>
    </html>
  );
}
