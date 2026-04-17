"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────────

export type PoolFormValues = {
  // Identity
  name: string;
  slug?: string;
  location_area?: string;
  latitude?: number | null;
  longitude?: number | null;

  // Contact
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;

  // Physical
  pool_length_m?: number | null;
  depth_min_m?: number | null;
  depth_max_m?: number | null;
  number_of_lanes?: number | null;
  indoor_outdoor?: "indoor" | "outdoor" | "both" | "";
  max_swimmers_capacity?: number | null;

  // Scores 1-5
  water_quality?: number | null;
  good_for_beginners?: number | null;
  good_for_training?: number | null;
  ease_of_access?: number | null;
  management_cooperation?: number | null;
  partnership_potential?: number | null;
  overall_score?: number | null;

  // Availability
  available_days_times?: string; // free-text JSON-like string, parsed on submit
  exclusive_lanes_available?: boolean | null;

  // Pricing
  price_per_swimmer_ngn?: number | null;
  flat_session_fee_ngn?: number | null;
  group_discount_available?: boolean | null;

  // Facilities
  has_changing_rooms?: boolean | null;
  has_showers?: boolean | null;
  has_lockers?: boolean | null;
  has_parking?: boolean | null;
  has_lifeguard?: boolean | null;

  // Operations
  video_content_allowed?: boolean | null;
  trial_session_possible?: boolean | null;

  // Safety (extended)
  lifeguard_count?: number | null;
  has_first_aid_kit?: boolean | null;
  has_aed?: boolean | null;
  has_cctv?: boolean | null;

  // Ops (extended)
  booking_lead_time_hours?: number | null;
  preferred_contact_channel?: "whatsapp" | "phone" | "email" | "in_person" | "";

  // Discovery
  source?:
    | "member_submission"
    | "team_scouting"
    | "referral"
    | "direct_outreach"
    | "other"
    | "";

  // Data quality
  last_verified_at?: string | null;

  // Partnership
  partnership_status?: string;

  // Meta
  pool_type?: string;
  notes?: string;
  is_active?: boolean;
};

type PoolFormProps = {
  initialValues?: Partial<PoolFormValues>;
  onSubmit: (values: PoolFormValues) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
  mode?: "create" | "edit";
};

// ─── Constants ──────────────────────────────────────────────────────────

const POOL_TYPES = ["community", "club", "academy", "private", "public", "hotel"] as const;
const INDOOR_OUTDOOR = ["indoor", "outdoor", "both"] as const;
const PARTNERSHIP_STATUSES = [
  "prospect",
  "evaluating",
  "active_partner",
  "inactive",
  "rejected",
] as const;
const CONTACT_CHANNELS = ["whatsapp", "phone", "email", "in_person"] as const;
const POOL_SOURCES = [
  "member_submission",
  "team_scouting",
  "referral",
  "direct_outreach",
  "other",
] as const;

const EMPTY: PoolFormValues = {
  name: "",
  slug: "",
  location_area: "",
  latitude: null,
  longitude: null,
  contact_person: "",
  contact_phone: "",
  contact_email: "",
  pool_length_m: null,
  depth_min_m: null,
  depth_max_m: null,
  number_of_lanes: null,
  indoor_outdoor: "",
  max_swimmers_capacity: null,
  water_quality: null,
  good_for_beginners: null,
  good_for_training: null,
  ease_of_access: null,
  management_cooperation: null,
  partnership_potential: null,
  overall_score: null,
  available_days_times: "",
  exclusive_lanes_available: null,
  price_per_swimmer_ngn: null,
  flat_session_fee_ngn: null,
  group_discount_available: null,
  has_changing_rooms: null,
  has_showers: null,
  has_lockers: null,
  has_parking: null,
  has_lifeguard: null,
  video_content_allowed: null,
  trial_session_possible: null,
  lifeguard_count: null,
  has_first_aid_kit: null,
  has_aed: null,
  has_cctv: null,
  booking_lead_time_hours: null,
  preferred_contact_channel: "",
  source: "",
  last_verified_at: null,
  partnership_status: "prospect",
  pool_type: "",
  notes: "",
  is_active: true,
};

// ─── Helpers ────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

function numOrNull(v: string): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function triState(v: boolean | null | undefined): "" | "yes" | "no" {
  if (v === true) return "yes";
  if (v === false) return "no";
  return "";
}

function fromTriState(v: string): boolean | null {
  if (v === "yes") return true;
  if (v === "no") return false;
  return null;
}

// ─── Component ──────────────────────────────────────────────────────────

export function PoolForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = "Save Pool",
  mode = "create",
}: PoolFormProps) {
  const [values, setValues] = useState<PoolFormValues>({ ...EMPTY, ...initialValues });
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof PoolFormValues>(key: K, v: PoolFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: v }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.name.trim()) return;
    setSubmitting(true);
    try {
      const finalValues: PoolFormValues = {
        ...values,
        slug: values.slug?.trim() || slugify(values.name),
      };
      await onSubmit(finalValues);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Identity */}
      <Section title="Identity">
        <Grid>
          <Field label="Pool name" required>
            <input
              type="text"
              required
              value={values.name}
              onChange={(e) => {
                const name = e.target.value;
                set("name", name);
                if (mode === "create") set("slug", slugify(name));
              }}
              placeholder="e.g. Yaba Olympic Pool"
              className={inputCls}
            />
          </Field>
          <Field label="Slug" hint="auto-generated from name">
            <input
              type="text"
              value={values.slug ?? ""}
              onChange={(e) => set("slug", e.target.value)}
              className={inputCls}
              disabled={mode === "edit"}
            />
          </Field>
          <Field label="Location area">
            <input
              type="text"
              value={values.location_area ?? ""}
              onChange={(e) => set("location_area", e.target.value)}
              placeholder="e.g. Yaba, Lagos"
              className={inputCls}
            />
          </Field>
          <Field label="Pool type">
            <select
              value={values.pool_type ?? ""}
              onChange={(e) => set("pool_type", e.target.value)}
              className={inputCls}
            >
              <option value="">Select…</option>
              {POOL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Latitude">
            <input
              type="number"
              step="any"
              value={values.latitude ?? ""}
              onChange={(e) => set("latitude", numOrNull(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Longitude">
            <input
              type="number"
              step="any"
              value={values.longitude ?? ""}
              onChange={(e) => set("longitude", numOrNull(e.target.value))}
              className={inputCls}
            />
          </Field>
        </Grid>
      </Section>

      {/* Contact */}
      <Section title="Contact">
        <Grid>
          <Field label="Contact person">
            <input
              type="text"
              value={values.contact_person ?? ""}
              onChange={(e) => set("contact_person", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              value={values.contact_phone ?? ""}
              onChange={(e) => set("contact_phone", e.target.value)}
              placeholder="+234…"
              className={inputCls}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={values.contact_email ?? ""}
              onChange={(e) => set("contact_email", e.target.value)}
              className={inputCls}
            />
          </Field>
        </Grid>
      </Section>

      {/* Physical */}
      <Section title="Physical">
        <Grid>
          <Field label="Pool length (m)">
            <input
              type="number"
              step="any"
              min={0}
              value={values.pool_length_m ?? ""}
              onChange={(e) => set("pool_length_m", numOrNull(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Depth min (m)">
            <input
              type="number"
              step="any"
              min={0}
              value={values.depth_min_m ?? ""}
              onChange={(e) => set("depth_min_m", numOrNull(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Depth max (m)">
            <input
              type="number"
              step="any"
              min={0}
              value={values.depth_max_m ?? ""}
              onChange={(e) => set("depth_max_m", numOrNull(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Number of lanes">
            <input
              type="number"
              min={0}
              value={values.number_of_lanes ?? ""}
              onChange={(e) => set("number_of_lanes", numOrNull(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Indoor / outdoor">
            <select
              value={values.indoor_outdoor ?? ""}
              onChange={(e) => set("indoor_outdoor", e.target.value as PoolFormValues["indoor_outdoor"])}
              className={inputCls}
            >
              <option value="">Select…</option>
              {INDOOR_OUTDOOR.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Max swimmers capacity">
            <input
              type="number"
              min={0}
              value={values.max_swimmers_capacity ?? ""}
              onChange={(e) => set("max_swimmers_capacity", numOrNull(e.target.value))}
              className={inputCls}
            />
          </Field>
        </Grid>
      </Section>

      {/* Scores */}
      <Section title="Component scores (1-5)" subtitle="Leave blank if not yet evaluated.">
        <Grid>
          {(
            [
              ["water_quality", "Water quality"],
              ["good_for_beginners", "Good for beginners"],
              ["good_for_training", "Good for training"],
              ["ease_of_access", "Ease of access"],
              ["management_cooperation", "Management cooperation"],
              ["partnership_potential", "Partnership potential"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <RatingInput
                value={values[key] ?? null}
                onChange={(v) => set(key, v)}
              />
            </Field>
          ))}
        </Grid>
      </Section>

      {/* Partnership rating (admin judgment) + live composite */}
      <Section
        title="Partnership rating"
        subtitle="Your overall judgment — not just the average. This captures factors the component scores may not (owner rapport, area security, strategic fit)."
      >
        <PartnershipRatingBlock
          values={values}
          onChange={(v) => set("overall_score", v)}
        />
      </Section>

      {/* Availability */}
      <Section title="Availability">
        <Grid>
          <Field label="Exclusive lanes available">
            <TriStateSelect
              value={values.exclusive_lanes_available}
              onChange={(v) => set("exclusive_lanes_available", v)}
            />
          </Field>
          <Field
            label="Available days / times"
            hint='Free-text, e.g. "Mon-Fri 6am-8am, Sat 7am-12pm"'
            className="sm:col-span-2"
          >
            <textarea
              rows={2}
              value={values.available_days_times ?? ""}
              onChange={(e) => set("available_days_times", e.target.value)}
              className={inputCls}
            />
          </Field>
        </Grid>
      </Section>

      {/* Pricing */}
      <Section title="Pricing">
        <Grid>
          <Field label="Price per swimmer (₦)">
            <input
              type="number"
              min={0}
              value={values.price_per_swimmer_ngn ?? ""}
              onChange={(e) => set("price_per_swimmer_ngn", numOrNull(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Flat session fee (₦)">
            <input
              type="number"
              min={0}
              value={values.flat_session_fee_ngn ?? ""}
              onChange={(e) => set("flat_session_fee_ngn", numOrNull(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Group discount available">
            <TriStateSelect
              value={values.group_discount_available}
              onChange={(v) => set("group_discount_available", v)}
            />
          </Field>
        </Grid>
      </Section>

      {/* Facilities */}
      <Section title="Facilities">
        <Grid cols={3}>
          {(
            [
              ["has_changing_rooms", "Changing rooms"],
              ["has_showers", "Showers"],
              ["has_lockers", "Lockers"],
              ["has_parking", "Parking"],
              ["has_lifeguard", "Lifeguard on duty"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <TriStateSelect value={values[key]} onChange={(v) => set(key, v)} />
            </Field>
          ))}
        </Grid>
      </Section>

      {/* Operations */}
      <Section title="Operations">
        <Grid>
          <Field label="Video / content allowed">
            <TriStateSelect
              value={values.video_content_allowed}
              onChange={(v) => set("video_content_allowed", v)}
            />
          </Field>
          <Field label="Trial session possible">
            <TriStateSelect
              value={values.trial_session_possible}
              onChange={(v) => set("trial_session_possible", v)}
            />
          </Field>
          <Field label="Booking lead time (hours)">
            <input
              type="number"
              min={0}
              value={values.booking_lead_time_hours ?? ""}
              onChange={(e) => set("booking_lead_time_hours", numOrNull(e.target.value))}
              className={inputCls}
              placeholder="e.g. 24"
            />
          </Field>
          <Field label="Preferred contact channel">
            <select
              value={values.preferred_contact_channel ?? ""}
              onChange={(e) =>
                set(
                  "preferred_contact_channel",
                  e.target.value as PoolFormValues["preferred_contact_channel"],
                )
              }
              className={inputCls}
            >
              <option value="">Unknown</option>
              {CONTACT_CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c.replace("_", " ")}
                </option>
              ))}
            </select>
          </Field>
        </Grid>
      </Section>

      {/* Safety (extended) */}
      <Section title="Safety" subtitle="Beyond the basics — compliance-relevant.">
        <Grid>
          <Field label="Lifeguard count" hint="How many are typically on duty?">
            <input
              type="number"
              min={0}
              value={values.lifeguard_count ?? ""}
              onChange={(e) => set("lifeguard_count", numOrNull(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="First aid kit on site">
            <TriStateSelect
              value={values.has_first_aid_kit}
              onChange={(v) => set("has_first_aid_kit", v)}
            />
          </Field>
          <Field label="AED / defibrillator">
            <TriStateSelect value={values.has_aed} onChange={(v) => set("has_aed", v)} />
          </Field>
          <Field label="CCTV installed">
            <TriStateSelect value={values.has_cctv} onChange={(v) => set("has_cctv", v)} />
          </Field>
        </Grid>
      </Section>

      {/* Discovery */}
      <Section title="Discovery & data quality">
        <Grid>
          <Field label="Source" hint="How did this pool enter our system?">
            <select
              value={values.source ?? ""}
              onChange={(e) =>
                set("source", e.target.value as PoolFormValues["source"])
              }
              className={inputCls}
            >
              <option value="">Unknown</option>
              {POOL_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Last verified"
            hint="Date the team last confirmed this pool's details are accurate."
          >
            <input
              type="date"
              value={values.last_verified_at ? values.last_verified_at.split("T")[0] : ""}
              onChange={(e) =>
                set(
                  "last_verified_at",
                  e.target.value ? new Date(e.target.value).toISOString() : null,
                )
              }
              className={inputCls}
            />
          </Field>
        </Grid>
      </Section>

      {/* Partnership + Notes */}
      <Section title="Partnership & notes">
        <Grid>
          <Field label="Partnership status">
            <select
              value={values.partnership_status ?? "prospect"}
              onChange={(e) => set("partnership_status", e.target.value)}
              className={inputCls}
            >
              {PARTNERSHIP_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </Field>
          {mode === "edit" && (
            <Field label="Active">
              <select
                value={values.is_active ? "yes" : "no"}
                onChange={(e) => set("is_active", e.target.value === "yes")}
                className={inputCls}
              >
                <option value="yes">Active</option>
                <option value="no">Inactive (soft-deleted)</option>
              </select>
            </Field>
          )}
          <Field label="Notes" className="sm:col-span-3">
            <textarea
              rows={3}
              value={values.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Internal notes, history, contact context..."
              className={inputCls}
            />
          </Field>
        </Grid>
      </Section>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting || !values.name.trim()}>
          {submitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

// ─── Presentational bits ────────────────────────────────────────────────

const inputCls =
  "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white";

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </h3>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </Card>
  );
}

function Grid({
  children,
  cols = 3,
}: {
  children: React.ReactNode;
  cols?: 2 | 3;
}) {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 ${
        cols === 3 ? "lg:grid-cols-3" : ""
      } gap-3`}
    >
      {children}
    </div>
  );
}

function Field({
  label,
  children,
  hint,
  required,
  className,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function TriStateSelect({
  value,
  onChange,
}: {
  value: boolean | null | undefined;
  onChange: (v: boolean | null) => void;
}) {
  return (
    <select
      value={triState(value)}
      onChange={(e) => onChange(fromTriState(e.target.value))}
      className={inputCls}
    >
      <option value="">Unknown</option>
      <option value="yes">Yes</option>
      <option value="no">No</option>
    </select>
  );
}

function RatingInput({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? null : n)}
          className={`h-8 w-8 rounded-md text-sm font-semibold ${
            value !== null && n <= value
              ? "bg-amber-400 text-white"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          {n}
        </button>
      ))}
      {value !== null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="ml-1 text-xs text-slate-400 hover:text-slate-600"
        >
          clear
        </button>
      )}
    </div>
  );
}

// ─── Weighted-composite helpers (mirror backend services/scoring.py) ─────

const SCORE_COMPONENTS = [
  "water_quality",
  "good_for_beginners",
  "good_for_training",
  "ease_of_access",
  "management_cooperation",
  "partnership_potential",
] as const;

type ScoreKey = (typeof SCORE_COMPONENTS)[number];

// Weight overrides by pool_type. All components default to 1.0.
const WEIGHT_OVERRIDES: Record<string, Partial<Record<ScoreKey, number>>> = {
  academy: { good_for_beginners: 1.5, good_for_training: 1.5 },
  club: { good_for_training: 1.5, partnership_potential: 1.5 },
  community: { ease_of_access: 1.5, water_quality: 1.5 },
  hotel: { water_quality: 1.5 },
  public: { ease_of_access: 1.5 },
  private: {},
};

function computeComposite(
  values: PoolFormValues,
): { score: number; usedComponents: number } | null {
  const weights: Record<ScoreKey, number> = {
    water_quality: 1,
    good_for_beginners: 1,
    good_for_training: 1,
    ease_of_access: 1,
    management_cooperation: 1,
    partnership_potential: 1,
    ...(WEIGHT_OVERRIDES[values.pool_type ?? ""] ?? {}),
  };

  let weightedSum = 0;
  let totalWeight = 0;
  let used = 0;
  for (const key of SCORE_COMPONENTS) {
    const v = values[key];
    if (v !== null && v !== undefined && Number.isFinite(v as number)) {
      weightedSum += (v as number) * weights[key];
      totalWeight += weights[key];
      used += 1;
    }
  }
  if (used === 0 || totalWeight === 0) return null;
  return { score: weightedSum / totalWeight, usedComponents: used };
}

function PartnershipRatingBlock({
  values,
  onChange,
}: {
  values: PoolFormValues;
  onChange: (v: number | null) => void;
}) {
  const composite = computeComposite(values);
  const compositeRounded = composite ? Math.round(composite.score * 10) / 10 : null;
  const overall = values.overall_score ?? null;
  const variance =
    compositeRounded !== null && overall !== null
      ? Math.abs(overall - compositeRounded)
      : null;
  // Flag significant gaps so admins can be intentional about overrides.
  const varianceFlag = variance !== null && variance >= 1.5;

  const weightsByType =
    values.pool_type && WEIGHT_OVERRIDES[values.pool_type]
      ? WEIGHT_OVERRIDES[values.pool_type]
      : null;
  const weightsDesc = weightsByType
    ? Object.entries(weightsByType)
        .map(([k, w]) => `${k.replace(/_/g, " ")} ×${w}`)
        .join(", ")
    : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start sm:gap-6">
        <div>
          <p className="text-xs font-medium text-slate-600 mb-1">Your rating</p>
          <RatingInput value={overall} onChange={onChange} />
        </div>

        <div className="flex-1 mt-3 sm:mt-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Component average
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {compositeRounded !== null ? compositeRounded.toFixed(1) : "—"}
                <span className="text-sm font-normal text-slate-400"> / 5</span>
              </p>
            </div>
            <div className="text-right text-xs text-slate-500">
              {composite ? (
                <>
                  <div>
                    based on {composite.usedComponents}/{SCORE_COMPONENTS.length} scored
                  </div>
                  {weightsDesc && (
                    <div className="mt-0.5 text-slate-400">Weights: {weightsDesc}</div>
                  )}
                </>
              ) : (
                <div>Rate some components above</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {varianceFlag && compositeRounded !== null && overall !== null && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <strong>Note:</strong> your rating ({overall}) differs from the component
          average ({compositeRounded.toFixed(1)}) by{" "}
          {variance!.toFixed(1)} {variance === 1 ? "point" : "points"}. Consider
          mentioning the reason in the Notes section below — it helps future admins
          understand your judgment.
        </div>
      )}
    </div>
  );
}
