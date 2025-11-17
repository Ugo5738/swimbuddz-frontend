import type { ReactNode } from "react";
import Link from "next/link";

type MainLayoutProps = {
  children: ReactNode;
};

export function MainLayout({ children }: MainLayoutProps) {
  const year = new Date().getFullYear();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="text-2xl font-semibold tracking-tight text-cyan-700">
            SwimBuddz
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600">
            <Link href="/" className="hover:text-cyan-700">
              Home
            </Link>
            <Link href="/about" className="hover:text-cyan-700">
              About
            </Link>
            <Link href="/guidelines" className="hover:text-cyan-700">
              Guidelines
            </Link>
            <Link href="/announcements" className="hover:text-cyan-700">
              Announcements
            </Link>
            <Link href="/login" className="text-cyan-700 hover:text-cyan-600">
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-cyan-600 px-4 py-2 text-white hover:bg-cyan-500"
            >
              Join
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t bg-white">
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
