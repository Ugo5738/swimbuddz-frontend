"use client";

import { programStatusLabel } from "@/components/admin/corporate/StatusBadges";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CohortPicker } from "@/components/ui/CohortPicker";
import {
  type CorporateProgram,
  corporateApi,
  nairaFromKobo,
} from "@/lib/corporate/api";
import { CheckCircle2, Link2, Users, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function ProgramOrchestrationPanel({
  program,
  onChange,
}: {
  program: CorporateProgram;
  onChange: () => void;
}) {
  const [cohortPick, setCohortPick] = useState<string | null>(program.cohort_id);
  const [linking, setLinking] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  const handleLink = async () => {
    if (!cohortPick) return toast.error("Pick a cohort first");
    setLinking(true);
    try {
      await corporateApi.linkCohort(program.id, { cohort_id: cohortPick });
      toast.success("Cohort linked");
      onChange();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLinking(false);
    }
  };

  const handleProvision = async () => {
    if (
      !confirm(
        `Provision a CorporateWallet with budget ${nairaFromKobo(
          program.total_kobo,
        )}?`,
      )
    )
      return;
    setProvisioning(true);
    try {
      await corporateApi.provisionWallet(program.id, {});
      toast.success("Wallet provisioned");
      onChange();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setProvisioning(false);
    }
  };

  const handleEnrollAll = async () => {
    if (
      !confirm(
        "Enroll every matched employee in every session of the linked cohort? This calls sessions_service bulk-booking.",
      )
    )
      return;
    setEnrolling(true);
    try {
      const res = await corporateApi.enrollAll(program.id);
      toast.success(
        `Enrolled ${res.enrolled} bookings · ${res.skipped_no_member_id} no-member · ${res.skipped_already_booked} already booked`,
      );
      onChange();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setEnrolling(false);
    }
  };

  const isTerminal =
    program.status === "completed" || program.status === "cancelled";

  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Cohort
          </h2>
          {program.cohort_id && (
            <span className="text-xs text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              linked
            </span>
          )}
        </div>
        <p className="text-sm text-slate-600">
          Pick the academy cohort these employees should attend. The corporate
          program stores the cohort id and uses it when bulk-enrolling.
        </p>
        <CohortPicker
          value={cohortPick}
          onChange={setCohortPick}
          activeOnly
          disabled={isTerminal}
        />
        <div className="flex justify-end">
          <Button
            onClick={handleLink}
            disabled={
              linking ||
              isTerminal ||
              !cohortPick ||
              cohortPick === program.cohort_id
            }
          >
            {linking
              ? "Linking…"
              : program.cohort_id === cohortPick
                ? "Linked"
                : "Link cohort"}
          </Button>
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Corporate wallet
          </h2>
          {program.corporate_wallet_id && (
            <span className="text-xs text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              provisioned
            </span>
          )}
        </div>
        <p className="text-sm text-slate-600">
          Creates a <code>CorporateWallet</code> in the wallet service with the
          program total ({nairaFromKobo(program.total_kobo)}) as the initial
          budget.
        </p>
        <div className="flex justify-end">
          <Button
            onClick={handleProvision}
            disabled={
              provisioning ||
              isTerminal ||
              program.corporate_wallet_id !== null
            }
          >
            {provisioning
              ? "Provisioning…"
              : program.corporate_wallet_id
                ? "Already provisioned"
                : "Provision wallet"}
          </Button>
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide flex items-center gap-2">
            <Users className="w-4 h-4" />
            Bulk enroll
          </h2>
        </div>
        <p className="text-sm text-slate-600">
          Books every employee with a resolved <code>member_id</code> into every
          session of the linked cohort. Idempotent — re-runs skip duplicates.
          Bumps program to <code>active</code> on the first successful run.
        </p>
        <div className="text-xs text-slate-500">
          {!program.cohort_id && (
            <p className="text-amber-700">⚠ Link a cohort first.</p>
          )}
        </div>
        <div className="flex justify-end">
          <Button
            onClick={handleEnrollAll}
            disabled={enrolling || isTerminal || !program.cohort_id}
          >
            {enrolling ? "Enrolling…" : "Enroll all matched employees"}
          </Button>
        </div>
      </Card>

      {program.status !== "draft" && (
        <Card className="p-4 bg-slate-50 text-sm text-slate-600">
          Program is{" "}
          <strong>{programStatusLabel(program.status).toLowerCase()}</strong>.
          {program.status === "active" &&
            " You can re-run enroll-all to add bookings for late additions."}
        </Card>
      )}
    </div>
  );
}
