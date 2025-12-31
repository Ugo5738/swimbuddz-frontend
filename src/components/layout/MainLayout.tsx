"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Header } from "./Header";

type MainLayoutProps = {
  children: ReactNode;
};

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const year = new Date().getFullYear();
  const isAdminRoute = pathname?.startsWith("/admin");

  // Member portal routes should use MemberLayout without the public header/footer
  const isMemberPortalRoute =
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/profile") ||
    pathname?.startsWith("/community/directory") ||
    pathname?.startsWith("/community/events") ||
    pathname?.startsWith("/community/tips") ||
    pathname?.startsWith("/community/coaches") ||
    pathname?.startsWith("/community/volunteers") ||
    pathname?.startsWith("/attendance") ||
    pathname?.startsWith("/checkout") ||
    pathname?.startsWith("/upgrade");

  if (isAdminRoute || isMemberPortalRoute) {
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
            <Link href="/membership" className="hover:text-cyan-700">
              Membership
            </Link>
            <Link href="/privacy" className="hover:text-cyan-700">
              Privacy
            </Link>
            <Link href="/announcements" className="hover:text-cyan-700">
              Announcements
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
