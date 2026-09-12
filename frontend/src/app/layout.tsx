import React from 'react';
import type { Metadata } from "next";
import "../styles/globals.css";
import Providers from "../components/common/Providers";
import Header from "../components/common/Header";
import SidebarDock from "../components/common/SidebarDock";
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
      <body className="min-h-screen bg-[#0B131B] text-[#F0F0F0] antialiased selection:bg-[#A4C8E1]/30 selection:text-[#F0F0F0] overflow-x-hidden font-sans relative">
        <GlobalErrorBoundary>
          <Providers>
            <RouteProgressBar />
            <div className="flex min-h-screen relative z-10">
              {/* Left Vertical Icon Dock */}
              <SidebarDock />

              {/* Main Content Area */}
              <div className="flex-1 w-full pl-0 sm:pl-[72px] md:pl-[80px] pb-16 sm:pb-0 flex flex-col min-h-screen relative z-10">
                {/* Floating Search Capsule in Top Right */}
                <Header />

                <main className="flex-1 w-full flex flex-col min-h-screen relative z-10">
                  <div className="flex-grow">
                    {children}
                  </div>
                  <Footer />
                </main>
              </div>
            </div>
          </Providers>
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}
