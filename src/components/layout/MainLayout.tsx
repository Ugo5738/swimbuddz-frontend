"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { WHATSAPP_GROUP_URL } from "@/lib/config";

type MainLayoutProps = {
  children: ReactNode;
};

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const year = new Date().getFullYear();
  const isAdminRoute = pathname?.startsWith("/admin");

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8" role="main">
        {children}
      </main>
      <footer className="border-t bg-white" role="contentinfo">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
          <p>© {year} SwimBuddz. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/guidelines-and-rules" className="hover:text-cyan-700">
              Guidelines
            </Link>
            <Link href="/privacy" className="hover:text-cyan-700">
              Privacy
            </Link>
            <Link href="/announcements" className="hover:text-cyan-700">
              Announcements
            </Link>
            <a
              href={WHATSAPP_GROUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700"
            >
              WhatsApp Group
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
