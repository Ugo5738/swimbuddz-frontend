"use client";

import { Banknote, Car, Waves } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin/pools", label: "Pool registry", icon: Waves },
  { href: "/admin/pools/pricing", label: "Areas & costing", icon: Banknote },
  { href: "/admin/transport", label: "Ride share", icon: Car },
];

export function LocationOperationsNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Location operations"
      className="flex gap-1 overflow-x-auto border-b border-slate-200"
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/admin/pools"
            ? pathname === href ||
              (pathname.startsWith("/admin/pools/") && !pathname.startsWith("/admin/pools/pricing"))
            : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              active
                ? "border-cyan-700 text-cyan-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
