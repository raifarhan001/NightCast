import React from 'react';
import type { Metadata, Viewport } from "next";
import "../styles/globals.css";
import Providers from "../components/common/Providers";
import Header from "../components/common/Header";
import SidebarDock from "../components/common/SidebarDock";
import Footer from "../components/common/Footer";
import RouteProgressBar from "../components/common/RouteProgressBar";
import RouteScrollRestoration from "../components/common/RouteScrollRestoration";
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

export const viewport: Viewport = {
  themeColor: "#0B131B",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-[#0B131B] text-[#F0F0F0] antialiased selection:bg-[#39AEA9]/30 selection:text-[#F0F0F0] overflow-x-hidden font-sans relative">
        {/* Skip to Main Content Link for Keyboard / Screen Reader Accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-[9999] px-4 py-2 bg-[#39AEA9] text-[#0B131B] font-bold text-xs rounded-full shadow-[0_0_20px_rgba(57,174,169,0.7)] outline-none focus:ring-2 focus:ring-white"
        >
          Skip to main content
        </a>

        <GlobalErrorBoundary>
          <Providers>
            <RouteProgressBar />
            <RouteScrollRestoration />
            <div className="flex min-h-screen relative z-10">
              {/* Left Vertical Icon Dock */}
              <SidebarDock />

              {/* Main Content Area */}
              <div className="flex-1 w-full pl-0 sm:pl-[72px] md:pl-[80px] pb-[calc(4rem+env(safe-area-inset-bottom,0px))] sm:pb-0 flex flex-col min-h-screen relative z-10">
                {/* Floating Search Capsule in Top Right */}
                <Header />

                <main id="main-content" className="flex-1 w-full flex flex-col relative z-10">
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
