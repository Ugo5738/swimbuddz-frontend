import type { ReactNode } from "react";
import Link from "next/link";
import { Header } from "./Header";

type MainLayoutProps = {
  children: ReactNode;
};

export function MainLayout({ children }: MainLayoutProps) {
  const year = new Date().getFullYear();

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
            <Link href="/guidelines" className="hover:text-cyan-700">
              Guidelines
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
