// Bare layout for the HR portal — intentionally NOT inside the (member)
// or (admin) groups because HR contacts aren't Supabase users; the portal
// has its own session in localStorage and its own header.

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Corporate Portal | SwimBuddz",
  description: "View your company's SwimBuddz program progress.",
  robots: { index: false, follow: false },
};

export default function CorporatePortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <a
            href="/"
            className="text-sm font-semibold text-slate-900 hover:text-sky-700"
          >
            SwimBuddz
          </a>
          <p className="text-xs uppercase tracking-wider text-slate-500">
            Corporate Portal
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">{children}</main>
    </div>
  );
}
