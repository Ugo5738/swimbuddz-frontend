"use client";

import {
  AgreementsTab,
  AssetsTab,
  ContactsTab,
  HistoryTab,
  VisitsTab,
} from "@/components/admin/PoolEditTabs";
import { PoolForm, type PoolFormValues } from "@/components/admin/PoolForm";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiDelete, apiGet, apiPatch } from "@/lib/api";
import {
  ArrowLeft,
  FileCheck2,
  History,
  Image as ImageIcon,
  MessageSquare,
  Settings,
  Trash2,
  Users,
  Waves,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type TabKey = "details" | "contacts" | "visits" | "history" | "agreements" | "assets";

const TABS: { key: TabKey; label: string; icon: typeof Users }[] = [
  { key: "details", label: "Details", icon: Settings },
  { key: "contacts", label: "Contacts", icon: Users },
  { key: "visits", label: "Visits", icon: MessageSquare },
  { key: "history", label: "History", icon: History },
  { key: "agreements", label: "Agreements", icon: FileCheck2 },
  { key: "assets", label: "Assets", icon: ImageIcon },
];

// ─── Types (match backend PoolResponse) ─────────────────────────────────

interface Pool {
  id: string;
  name: string;
  slug: string;
  location_area: string | null;
  latitude: number | null;
  longitude: number | null;
  contact_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  pool_length_m: number | null;
  depth_min_m: number | null;
  depth_max_m: number | null;
  number_of_lanes: number | null;
  indoor_outdoor: "indoor" | "outdoor" | "both" | null;
  max_swimmers_capacity: number | null;
  water_quality: number | null;
  good_for_beginners: number | null;
  good_for_training: number | null;
  ease_of_access: number | null;
  management_cooperation: number | null;
  partnership_potential: number | null;
  overall_score: number | null;
  computed_score: string | number | null; // Decimal serialized as string by Pydantic
  available_days_times: Record<string, unknown> | null;
  exclusive_lanes_available: boolean | null;
  price_per_swimmer_ngn: number | null;
  flat_session_fee_ngn: number | null;
  group_discount_available: boolean | null;
  has_changing_rooms: boolean | null;
  has_showers: boolean | null;
  has_lockers: boolean | null;
  has_parking: boolean | null;
  has_lifeguard: boolean | null;
  video_content_allowed: boolean | null;
  trial_session_possible: boolean | null;
  // Phase 1 additions
  lifeguard_count: number | null;
  has_first_aid_kit: boolean | null;
  has_aed: boolean | null;
  has_cctv: boolean | null;
  booking_lead_time_hours: number | null;
  preferred_contact_channel:
    | "whatsapp"
    | "phone"
    | "email"
    | "in_person"
    | null;
  source:
    | "member_submission"
    | "team_scouting"
    | "referral"
    | "direct_outreach"
    | "other"
    | null;
  last_verified_at: string | null;
  partnership_status: string;
  pool_type: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function poolToFormValues(pool: Pool): PoolFormValues {
  return {
    name: pool.name,
    slug: pool.slug,
    location_area: pool.location_area ?? "",
    latitude: pool.latitude,
    longitude: pool.longitude,
    contact_person: pool.contact_person ?? "",
    contact_phone: pool.contact_phone ?? "",
    contact_email: pool.contact_email ?? "",
    pool_length_m: pool.pool_length_m,
    depth_min_m: pool.depth_min_m,
    depth_max_m: pool.depth_max_m,
    number_of_lanes: pool.number_of_lanes,
    indoor_outdoor: pool.indoor_outdoor ?? "",
    max_swimmers_capacity: pool.max_swimmers_capacity,
    water_quality: pool.water_quality,
    good_for_beginners: pool.good_for_beginners,
    good_for_training: pool.good_for_training,
    ease_of_access: pool.ease_of_access,
    management_cooperation: pool.management_cooperation,
    partnership_potential: pool.partnership_potential,
    overall_score: pool.overall_score,
    available_days_times:
      pool.available_days_times && typeof pool.available_days_times === "object"
        ? JSON.stringify(pool.available_days_times, null, 2)
        : "",
    exclusive_lanes_available: pool.exclusive_lanes_available,
    price_per_swimmer_ngn: pool.price_per_swimmer_ngn,
    flat_session_fee_ngn: pool.flat_session_fee_ngn,
    group_discount_available: pool.group_discount_available,
    has_changing_rooms: pool.has_changing_rooms,
    has_showers: pool.has_showers,
    has_lockers: pool.has_lockers,
    has_parking: pool.has_parking,
    has_lifeguard: pool.has_lifeguard,
    video_content_allowed: pool.video_content_allowed,
    trial_session_possible: pool.trial_session_possible,
    lifeguard_count: pool.lifeguard_count,
    has_first_aid_kit: pool.has_first_aid_kit,
    has_aed: pool.has_aed,
    has_cctv: pool.has_cctv,
    booking_lead_time_hours: pool.booking_lead_time_hours,
    preferred_contact_channel: pool.preferred_contact_channel ?? "",
    source: pool.source ?? "",
    last_verified_at: pool.last_verified_at,
    partnership_status: pool.partnership_status,
    pool_type: pool.pool_type ?? "",
    notes: pool.notes ?? "",
    is_active: pool.is_active,
  };
}

function formValuesToPayload(values: PoolFormValues): Record<string, unknown> {
  return {
    name: values.name,
    // slug is immutable in edit mode; omit it from the patch
    location_area: values.location_area || null,
    latitude: values.latitude ?? null,
    longitude: values.longitude ?? null,
    contact_person: values.contact_person || null,
    contact_phone: values.contact_phone || null,
    contact_email: values.contact_email || null,
    pool_length_m: values.pool_length_m ?? null,
    depth_min_m: values.depth_min_m ?? null,
    depth_max_m: values.depth_max_m ?? null,
    number_of_lanes: values.number_of_lanes ?? null,
    indoor_outdoor: values.indoor_outdoor || null,
    max_swimmers_capacity: values.max_swimmers_capacity ?? null,
    water_quality: values.water_quality ?? null,
    good_for_beginners: values.good_for_beginners ?? null,
    good_for_training: values.good_for_training ?? null,
    ease_of_access: values.ease_of_access ?? null,
    management_cooperation: values.management_cooperation ?? null,
    partnership_potential: values.partnership_potential ?? null,
    overall_score: values.overall_score ?? null,
    available_days_times: (() => {
      const v = values.available_days_times?.trim();
      if (!v) return null;
      try {
        return JSON.parse(v);
      } catch {
        return { schedule: v };
      }
    })(),
    exclusive_lanes_available: values.exclusive_lanes_available ?? null,
    price_per_swimmer_ngn: values.price_per_swimmer_ngn ?? null,
    flat_session_fee_ngn: values.flat_session_fee_ngn ?? null,
    group_discount_available: values.group_discount_available ?? null,
    has_changing_rooms: values.has_changing_rooms ?? null,
    has_showers: values.has_showers ?? null,
    has_lockers: values.has_lockers ?? null,
    has_parking: values.has_parking ?? null,
    has_lifeguard: values.has_lifeguard ?? null,
    video_content_allowed: values.video_content_allowed ?? null,
    trial_session_possible: values.trial_session_possible ?? null,
    lifeguard_count: values.lifeguard_count ?? null,
    has_first_aid_kit: values.has_first_aid_kit ?? null,
    has_aed: values.has_aed ?? null,
    has_cctv: values.has_cctv ?? null,
    booking_lead_time_hours: values.booking_lead_time_hours ?? null,
    preferred_contact_channel: values.preferred_contact_channel || null,
    source: values.source || null,
    last_verified_at: values.last_verified_at ?? null,
    partnership_status: values.partnership_status ?? "prospect",
    pool_type: values.pool_type || null,
    notes: values.notes || null,
    is_active: values.is_active ?? true,
  };
}

// ─── Component ──────────────────────────────────────────────────────────

export default function EditPoolPage() {
  const router = useRouter();
  const params = useParams<{ poolId: string }>();
  const poolId = params.poolId;

  const [pool, setPool] = useState<Pool | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("details");

  const loadPool = useCallback(async () => {
    if (!poolId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<Pool>(`/api/v1/admin/pools/${poolId}`, { auth: true });
      setPool(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load pool";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [poolId]);

  useEffect(() => {
    loadPool();
  }, [loadPool]);

  const handleSave = async (values: PoolFormValues) => {
    try {
      const payload = formValuesToPayload(values);
      const updated = await apiPatch<Pool>(`/api/v1/admin/pools/${poolId}`, payload, {
        auth: true,
      });
      setPool(updated);
      toast.success("Pool updated");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update pool";
      toast.error(msg);
      throw e;
    }
  };

  const handleDelete = async () => {
    if (!pool) return;
    if (!confirm(`Deactivate "${pool.name}"? This soft-deletes the pool.`)) return;
    try {
      await apiDelete(`/api/v1/admin/pools/${pool.id}`, { auth: true });
      toast.success("Pool deactivated");
      router.push("/admin/pools");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to delete pool";
      toast.error(msg);
    }
  };

  if (loading) return <LoadingCard text="Loading pool..." />;

  if (error) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/pools"
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to pools
        </Link>
        <Alert variant="error" title="Could not load pool">
          {error}
        </Alert>
      </div>
    );
  }

  if (!pool) return null;

  return (
    <div className="space-y-4">
      <Link
        href="/admin/pools"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to pools
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Waves className="w-6 h-6 text-cyan-600" />
            {pool.name}
          </h1>
          <p className="text-sm text-slate-500">
            {pool.location_area || "No area"} &middot; {pool.pool_type || "type unknown"}
            {" · "}
            <span className="capitalize">{pool.partnership_status.replace("_", " ")}</span>
            {!pool.is_active && <span className="text-rose-600"> &middot; inactive</span>}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleDelete}
          className="border-rose-300 text-rose-700 hover:bg-rose-50"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Deactivate
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === key
                ? "border-cyan-600 text-cyan-700"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "details" && (
        <Card className="p-6 bg-white">
          <PoolForm
            mode="edit"
            initialValues={poolToFormValues(pool)}
            onSubmit={handleSave}
            onCancel={() => router.push("/admin/pools")}
            submitLabel="Save changes"
          />
        </Card>
      )}
      {activeTab === "contacts" && <ContactsTab poolId={pool.id} />}
      {activeTab === "visits" && <VisitsTab poolId={pool.id} />}
      {activeTab === "history" && <HistoryTab poolId={pool.id} />}
      {activeTab === "agreements" && <AgreementsTab poolId={pool.id} />}
      {activeTab === "assets" && <AssetsTab poolId={pool.id} />}
    </div>
  );
}
