import type { ReactNode } from "react";
import Link from "next/link";

type AdminLayoutProps = {
  children: ReactNode;
};

const adminNav = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/sessions", label: "Sessions" },
  { href: "/admin/announcements", label: "Announcements" },
  { href: "/admin/attendance", label: "Attendance" }
];

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between">
          <Link href="/admin/dashboard" className="text-2xl font-semibold tracking-tight text-cyan-700">
            SwimBuddz Admin
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600">
            {adminNav.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-cyan-700">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
