"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { OpenSwimForm } from "@/components/events/OpenSwimForm";

export default function CreateOpenSwimPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <Link
        href="/community/events"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-cyan-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to events
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
          Host an open swim
        </h1>
        <p className="text-sm text-slate-600">
          Organize your own swim and invite the community. Pick a partner pool to
          collect the per-swimmer fee automatically, or keep it free.
        </p>
      </header>

      <OpenSwimForm mode="create" />
    </div>
  );
}
