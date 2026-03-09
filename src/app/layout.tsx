import { MainLayout } from "@/components/layout/MainLayout";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { GoogleAnalytics } from "@/components/providers/GoogleAnalytics";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import "../styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "SwimBuddz",
  description:
    "SwimBuddz – building a global swimming community (community, club, and academy). Mobile-first experience for swimmers worldwide, currently active in Lagos.",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <GoogleAnalytics />
        <AuthProvider>
          <MainLayout>{children}</MainLayout>
        </AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#1e293b",
              color: "#f8fafc",
              border: "none",
            },
          }}
          richColors
          closeButton
        />
      </body>
    </html>
  );
}
