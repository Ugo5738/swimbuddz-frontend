"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { apiPost } from "@/lib/api";
import { Club } from "@/lib/clubs";
import { ClubPlan } from "@/lib/clubOnboarding";
import { useApi } from "@/hooks/useApi";

const css = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2";
type Template = {
  id: string;
  title: string;
  club_id?: string;
  pod_id?: string;
  club_access_mode?: string;
};

export function ClubQuarterRecommendation({
  clubs,
  onCreated,
}: {
  clubs: Club[];
  onCreated: (plan: ClubPlan) => Promise<void>;
}) {
  const templates = useApi<Template[]>("/api/v1/sessions/templates");
  const [club, setClub] = useState("");
  const [template, setTemplate] = useState<string[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);
  const [configure, setConfigure] = useState(true);
  const [expected, setExpected] = useState(20);
  const [margin, setMargin] = useState("");
  const [marginType, setMarginType] = useState("fixed_per_attendee");
  const [staff, setStaff] = useState(0);
  const [lanes, setLanes] = useState(1);
  const [capacity, setCapacity] = useState(20);
  const [excluded, setExcluded] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const selectedLocation = clubs.find(c => c.id === club);
  const canAdvance = Boolean(club && year >= 2026 && quarter >= 1 && quarter <= 4 && capacity > 0);
  return (
    <Card>
      <h2 className="text-xl font-semibold">Create a Club quarter</h2>
      <p className="mt-1 text-sm font-medium text-cyan-700">1. Location and weekly swim → 2. Cost assumptions → 3. Review dates and publish</p>
      <div role="status" className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
        {step === 1 ? "Step 1 of 2: choose which Club, practice and quarter to prepare." :
          `Step 2 of 2: confirm estimates for ${selectedLocation?.name || "this Club"} before generating a reviewable draft.`}
      </div>
      <p className="my-3 text-sm text-slate-600">
        Works for your first quarter too. The normal Club product should select one regular weekly
        <strong> plan-included</strong> series; selecting multiple series means members are buying
        and will be automatically reserved into every selected series. Optional extra practices
        should use active-club or paid-add-on templates instead. Inherited pool and operating costs
        are quoted separately for every date. Review the price and dates before publishing.
      </p>
      {(error || templates.error) && <Alert variant="error">{error || templates.error}</Alert>}
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          try {
            const plan = await apiPost<ClubPlan>(
              "/api/v1/clubs/admin/plans/recommendations",
              {
                club_id: club,
                year,
                quarter,
                template_id: null,
                template_ids: template,
                capacity,
                excluded_dates: excluded
                  .split(",")
                  .map((v) => v.trim())
                  .filter(Boolean),
                pricing_settings: configure
                  ? {
                      pricing_expected_attendees: expected,
                      margin_type: marginType,
                      margin_value: Number(margin),
                      expected_staff: staff,
                      lanes,
                    }
                  : null,
              },
              { auth: true }
            );
            await onCreated(plan);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not generate recommendation");
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
          {step === 1 && <><label>
            Club location
            <select
              required
              className={css}
              value={club}
              onChange={(e) => {
                setClub(e.target.value);
                setTemplate([]);
              }}
            >
              <option value="">Choose a Club location</option>
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div className="space-y-2">
            <p className="text-sm font-medium">Which regular practice is included?</p>
            <p className="text-xs text-slate-600">Most Club quarters include one practice a week. Choose more only if members are buying multiple sessions every week.</p>
            {templates.data?.filter(t => t.club_id === club && !t.pod_id && t.club_access_mode === "plan_included").length ? (
              <div className="space-y-2">
                {templates.data?.filter(t => t.club_id === club && !t.pod_id && t.club_access_mode === "plan_included").map(t => (
                  <label key={t.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm">
                    <input type="checkbox" checked={template.includes(t.id)}
                      onChange={e => {
                        const next = e.target.checked ? [...template, t.id] : template.filter(id => id !== t.id);
                        setTemplate(next);
                        setConfigure(!next.length);
                      }} />
                    <span>{t.title}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-amber-200 p-3 text-sm text-amber-800">
                No regular Club template is set up at this location yet. Configure the weekly practice in Session Templates, or use the saved Club default schedule below.
              </p>
            )}
          </div>
          <label>
            Year
            <input
              required
              type="number"
              min="2026"
              max="2100"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className={css}
            />
          </label>
          <label>
            Quarter
            <select
              className={css}
              value={quarter}
              onChange={(e) => setQuarter(Number(e.target.value))}
            >
              {[1, 2, 3, 4].map((q) => (
                <option key={q} value={q}>
                  Q{q}
                </option>
              ))}
            </select>
          </label>
          <label>
            Maximum quarter members
            <input
              required
              type="number"
              min="1"
              max="500"
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className={css}
            />
          </label>
          <label>
            Excluded swim dates (optional, comma-separated)
            <input
              className={css}
              placeholder="2026-12-05"
              value={excluded}
              onChange={(e) => setExcluded(e.target.value)}
            />
          </label>
          </>}
          {step === 2 && <>
          <label className="sm:col-span-2">
            <input
              type="checkbox"
              checked={configure}
              onChange={(e) => setConfigure(e.target.checked)}
            />{" "}
            Configure expected attendance and margin; otherwise reuse saved template settings
          </label>
          {configure && (
            <>
              <label>
                Expected swimmers each week (for sharing costs)
                <input
                  required
                  type="number"
                  min="1"
                  max="500"
                  value={expected}
                  onChange={(e) => setExpected(Number(e.target.value))}
                  className={css}
                />
              </label>
              <label>
                Margin basis
                <select
                  className={css}
                  value={marginType}
                  onChange={(e) => setMarginType(e.target.value)}
                >
                  <option value="fixed_per_attendee">Fixed ₦ per attendee</option>
                  <option value="percentage">Percentage of attendee cost</option>
                </select>
              </label>
              <label>
                Margin ({marginType === "percentage" ? "%" : "₦"})
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={margin}
                  onChange={(e) => setMargin(e.target.value)}
                  className={css}
                />
              </label>
              <label>
                Expected staff
                <input
                  required
                  type="number"
                  min="0"
                  max="50"
                  value={staff}
                  onChange={(e) => setStaff(Number(e.target.value))}
                  className={css}
                />
              </label>
              <label>
                Lanes
                <input
                  required
                  type="number"
                  min="1"
                  max="50"
                  value={lanes}
                  onChange={(e) => setLanes(Number(e.target.value))}
                  className={css}
                />
              </label>
            </>
          )}
          </>}
        </fieldset>
        <p className="my-3 text-sm text-slate-600">
          Refreshment costs come from the same inherited operating rates as other Sessions. An
          Experience does not automatically remove a swim. Exclude a date only if no swim is being
          promised on that date.
        </p>
        <div className="flex flex-wrap gap-2">
          {step === 2 && <Button type="button" variant="outline" disabled={busy} onClick={() => setStep(1)}>Back to location and schedule</Button>}
          {step === 1 ? <Button type="button" disabled={!canAdvance || busy} onClick={() => setStep(2)}>Continue to cost estimates</Button> :
            <Button type="submit" disabled={busy}>{busy ? "Generating…" : "Generate reviewable quarter"}</Button>}
        </div>
      </form>
    </Card>
  );
}
