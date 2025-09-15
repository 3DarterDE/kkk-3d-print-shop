import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import CategoryNavigation from "@/components/CategoryNavigation";
import Breadcrumb from "@/components/Breadcrumb";
import Footer from "@/components/Footer";
import CartValidationProvider from "../components/CartValidationProvider";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <CartValidationProvider>
          <Navbar />
          <CategoryNavigation />
          <main className="pt-16">{children}</main>
          <Footer />
        </CartValidationProvider>
      </body>
    </html>
  );
}
