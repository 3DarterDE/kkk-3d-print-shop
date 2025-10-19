import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import CategoryNavigation from "@/components/CategoryNavigation";
import Breadcrumb from "@/components/Breadcrumb";
import Footer from "@/components/Footer";
import MobileSearchBar from "@/components/MobileSearchBar";
import MobileSpacer from "@/components/MobileSpacer";
import CartValidationProvider from "../components/CartValidationProvider";
import VerificationRedirect from "@/components/VerificationRedirect";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import { UserDataProvider } from "@/lib/contexts/UserDataContext";
import { ShopDataProvider } from "@/lib/contexts/ShopDataContext";
import Script from "next/script";
import { headers as nextHeaders } from "next/headers";
import * as Sentry from "@sentry/nextjs";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : "http://localhost:3000")),
  title: {
    default: "3D-Druckteile | Shop & Blog",
    template: "%s | 3D-Druckteile",
  },
  description: "Individuelle 3D-Druckartikel: Shop, Blog und Informationen.",
  openGraph: {
    type: "website",
    title: "3D-Druckteile | Shop & Blog",
    description: "Individuelle 3D-Druckartikel: Shop, Blog und Informationen.",
    url: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headers = await nextHeaders();
  const nonce = headers.get('x-csp-nonce') || undefined;
  
  if (process.env.NEXT_PUBLIC_SENTRY_DSN && !Sentry.isInitialized()) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.0,
      replaysOnErrorSampleRate: 1.0,
      debug: false,
    });
  }
  return (
    <html lang="en">
      <head>
        <Script id="init" nonce={nonce} dangerouslySetInnerHTML={{ __html: 'window.__INIT__=true' }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <CartValidationProvider>
          <UserDataProvider>
            <ShopDataProvider>
              <VerificationRedirect />
              <Navbar />
              <CategoryNavigation />
              
              <MobileSearchBar />
              <MobileSpacer />
              
              <main className="pt-16 md:pt-16">{children}</main>
              <Footer />
              <ScrollToTopButton />
            </ShopDataProvider>
          </UserDataProvider>
        </CartValidationProvider>
      </body>
    </html>
  );
}
