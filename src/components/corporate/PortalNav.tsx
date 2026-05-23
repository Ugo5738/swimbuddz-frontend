"use client";

// Header bar shown on authenticated HR-portal pages. Surfaces the company
// + signed-in contact, plus a sign-out button.

import { LogOut, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { clearPortalSession, type PortalSession } from "@/lib/corporate/portal-api";

export function PortalNav({ session }: { session: PortalSession }) {
  const router = useRouter();

  function onSignOut() {
    clearPortalSession();
    router.push("/corporate-portal");
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-sm">
        <Building2 className="h-4 w-4 text-sky-600" />
        <span className="font-medium text-slate-900">
          {session.company_name}
        </span>
        <span className="text-slate-400">·</span>
        <span className="text-slate-600">
          Signed in as {session.primary_contact_name}
        </span>
      </div>
      <button
        onClick={onSignOut}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        <LogOut className="h-3.5 w-3.5" />
        Sign out
      </button>
    </div>
  );
}
