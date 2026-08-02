"use client";

import { Checkbox } from "@/components/ui/Checkbox";
import Link from "next/link";

type ClubStandardsAcknowledgementProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function ClubStandardsAcknowledgement({
  checked,
  onChange,
}: ClubStandardsAcknowledgementProps) {
  return (
    <section
      aria-labelledby="club-standards-acknowledgement-title"
      className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5"
    >
      <div className="flex items-start gap-3">
        <Checkbox
          id="club-standards-accepted"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-describedby="club-standards-acknowledgement-help"
          className="mt-1 h-5 w-5 shrink-0"
        />
        <div>
          <label
            id="club-standards-acknowledgement-title"
            htmlFor="club-standards-accepted"
            className="cursor-pointer text-sm font-semibold leading-6 text-slate-900"
          >
            I have read and agree to follow the SwimBuddz Club Standards.
          </label>
          <p
            id="club-standards-acknowledgement-help"
            className="mt-1 text-xs leading-5 text-slate-600"
          >
            This is required for Club sessions. The standards cover attendance, safety, conduct,
            pods, personal boundaries and progress feedback.
          </p>
          <Link
            href="/club/standards"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex text-sm font-semibold text-cyan-800 hover:text-cyan-700"
          >
            Read the Club Standards →
          </Link>
        </div>
      </div>
    </section>
  );
}
