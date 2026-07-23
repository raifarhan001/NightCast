import React from 'react';
import type { Metadata } from "next";
import "../styles/globals.css";
import Providers from "../components/common/Providers";
import Header from "../components/common/Header";
import Footer from "../components/common/Footer";
import RouteProgressBar from "../components/common/RouteProgressBar";
import { GlobalErrorBoundary } from '../components/shared/ErrorBoundaries';

export const metadata: Metadata = {
  title: {
    default: "Nightcast — Watch Movies & Shows",
    template: "%s | Nightcast"
  },
  description: "Next-Generation Cinematic Streaming Experience.",
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
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-[#080A0F] text-white antialiased selection:bg-white selection:text-black overflow-x-hidden font-sans relative">
        <GlobalErrorBoundary>
          <Providers>
            <RouteProgressBar />
            <div className="flex flex-col min-h-screen relative z-10">
              <Header />
              <main className="flex-1 w-full flex flex-col min-h-screen relative z-10">
                <div className="flex-grow">
                  {children}
                </div>
                <Footer />
              </main>
            </div>
          </Providers>
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}
