import React from 'react';
import type { Metadata } from "next";
import "../styles/globals.css";
import Providers from "../components/common/Providers";
import Header from "../components/common/Header";
import Footer from "../components/common/Footer";
import { GlobalErrorBoundary } from '../components/shared/ErrorBoundaries';

export const metadata: Metadata = {
  title: {
    default: "NEXUS PLAY - Stream Movies & TV Shows",
    template: "%s | NEXUS PLAY"
  },
  description: "Stream your favorite movies and TV shows ad-free, smoothly, and in high definition on NEXUS PLAY.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen bg-[#020202] text-zinc-100">
        <GlobalErrorBoundary>
          <Providers>
            <Header/>
            <main className="flex-grow">{children}</main>
            <Footer/>
          </Providers>
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}
