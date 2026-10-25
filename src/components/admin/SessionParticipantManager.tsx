"use client";

import { useState } from "react";
import Link from "next/link";
import { AcademySessionAllocations } from "@/components/admin/AcademySessionAllocations";
import { RecordSessionWalkIn, type GuestWalkInInput, type WalkInMember } from "@/components/admin/RecordSessionWalkIn";
import { GuestSessionAdminCard } from "@/components/guest-passes/GuestSessionAdminCard";


type Enrollment = { id: string; member_id: string; status: string };
type ParticipantType = "academy" | "member" | "guest";

export function SessionParticipantManager({
  sessionId,
  isAcademy,
  sessionStarted,
  enrollments,
  memberNames,
  defaultMemberFee,
  defaultGuestFee,
  eligibleClubMembers,
  disabled,
  onRecordAcademy,
  onRecordMember,
  onRecordGuest,
}: {
  sessionId: string;
  isAcademy: boolean;
  sessionStarted: boolean;
  enrollments: Enrollment[];
  memberNames: Record<string, string>;
  defaultMemberFee: number;
  defaultGuestFee: number;
  eligibleClubMembers?: WalkInMember[];
  disabled: boolean;
  onRecordAcademy: () => void;
  onRecordMember: (memberId: string, feeKobo: number, note: string, overrideReason?: string) => Promise<void>;
  onRecordGuest: (input: GuestWalkInInput) => Promise<void>;
}) {
  const [type, setType] = useState<ParticipantType>(isAcademy ? "academy" : "member");
  const choice: ParticipantType = !isAcademy && type === "academy" ? "member" : type;
  const enrolledMemberIds = new Set(enrollments.filter((row) => row.status === "enrolled").map((row) => row.member_id));
  const [memberError, setMemberError] = useState("");
  async function recordNonStudent(memberId: string, feeKobo: number, note: string, overrideReason?: string) {
    if (isAcademy && enrolledMemberIds.has(memberId)) {
      setMemberError("This person is enrolled in the cohort. Use Academy student so their lesson balance and fee are correct.");
      return;
    }
    setMemberError("");
    await onRecordMember(memberId, feeKobo, note, overrideReason);
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:hidden" aria-labelledby="session-participant-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="session-participant-heading" className="text-lg font-semibold text-slate-900">Record a participant</h2>
          <p className="mt-1 text-sm text-slate-600">
            Choose who attended. Each route records the correct booking and attendance;
            payments are reconciled separately.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {sessionStarted ? "Session started" : "Before session"}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="Participant type">
        {isAcademy && (
          <button type="button" aria-pressed={choice === "academy"} onClick={() => setType("academy")}
            className={`rounded-lg border p-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-600 ${choice === "academy" ? "border-cyan-600 bg-cyan-50 text-cyan-900" : "border-slate-200 hover:bg-slate-50"}`}>
            <span className="block text-sm font-semibold">Academy student</span>
            <span className="mt-1 block text-xs">Prepaid or separately paid class</span>
          </button>
        )}
        <button type="button" aria-pressed={choice === "member"} onClick={() => setType("member")}
          className={`rounded-lg border p-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-600 ${choice === "member" ? "border-cyan-600 bg-cyan-50 text-cyan-900" : "border-slate-200 hover:bg-slate-50"}`}>
          <span className="block text-sm font-semibold">Existing member</span>
          <span className="mt-1 block text-xs">Club, Community or guest visit</span>
        </button>
        <button type="button" aria-pressed={choice === "guest"} onClick={() => setType("guest")}
          className={`rounded-lg border p-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-600 ${choice === "guest" ? "border-cyan-600 bg-cyan-50 text-cyan-900" : "border-slate-200 hover:bg-slate-50"}`}>
          <span className="block text-sm font-semibold">Unregistered guest</span>
          <span className="mt-1 block text-xs">Guest record, payment and waiver follow-up</span>
        </button>
      </div>
      {!sessionStarted ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900" role="status">
          Attendance recording becomes available after this session starts. Advance guest invitations can be managed below.
        </p>
      ) : choice === "academy" && isAcademy ? (
        <>
        <AcademySessionAllocations
          sessionId={sessionId}
          enrollments={enrollments}
          memberNames={memberNames}
          onRecorded={onRecordAcademy}
          embedded
        />
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          Recording a make-up or approved support lesson? Use the existing <Link href="/admin/makeups" className="font-semibold text-cyan-700 underline">Make-ups workflow</Link> or its authorised Academy support process. Those credits are not interchangeable with a prepaid class or paid extra.
        </div>
        </>
      ) : (
        <>
          {choice === "member" && isAcademy && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              If this person is enrolled in the selected Academy cohort, use <strong>Academy student</strong> instead.
              This route is only for other existing members attending as guests. Check eligibility and the agreed price.
            </p>
          )}
          {memberError && <p role="alert" className="text-sm text-rose-700">{memberError}</p>}
          <RecordSessionWalkIn
            sessionId={sessionId}
            key={`${sessionId}-${choice}`}
            defaultFee={defaultMemberFee}
            defaultGuestFee={defaultGuestFee}
            disabled={disabled}
            eligibleMembers={eligibleClubMembers}
            onRecord={recordNonStudent}
            onRecordGuest={onRecordGuest}
            mode={choice === "guest" ? "guest" : "member"}
            embedded
          />
        </>
      )}
      <details className="border-t border-slate-200 pt-3">
        <summary className="cursor-pointer text-sm font-medium text-cyan-700">Invite a guest or share a booking link</summary>
        <div className="mt-3">
          <GuestSessionAdminCard sessionId={sessionId} />
        </div>
      </details>
      {choice === "guest" && (
        <p className="text-xs text-slate-500">
          Recording a guest does not certify waiver completion or payment. Resolve any missing waiver before pool access.
        </p>
      )}
    </section>
  );
}
