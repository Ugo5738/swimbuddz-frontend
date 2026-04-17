"use client";

import { PoolForm, type PoolFormValues } from "@/components/admin/PoolForm";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { apiPost } from "@/lib/api";
import {
  ArrowLeft,
  FileCheck2,
  History,
  Image as ImageIcon,
  Lock,
  MessageSquare,
  Settings,
  Users,
  Waves,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type TabKey =
  | "details"
  | "contacts"
  | "visits"
  | "history"
  | "agreements"
  | "assets";

// Tabs are visible on the new-pool screen but everything except Details is
// disabled, so admins see what's coming after save without being able to
// click away prematurely.
const TABS: { key: TabKey; label: string; icon: typeof Users }[] = [
  { key: "details", label: "Details", icon: Settings },
  { key: "contacts", label: "Contacts", icon: Users },
  { key: "visits", label: "Visits", icon: MessageSquare },
  { key: "history", label: "History", icon: History },
  { key: "agreements", label: "Agreements", icon: FileCheck2 },
  { key: "assets", label: "Assets", icon: ImageIcon },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

export default function NewPoolPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (values: PoolFormValues) => {
    setError(null);
    // Convert empty strings → null for nullable backend fields; parse the
    // free-text availability schedule into a JSON object.
    const payload = {
      ...values,
      slug: values.slug || slugify(values.name),
      location_area: values.location_area || null,
      pool_type: values.pool_type || null,
      contact_person: values.contact_person || null,
      contact_phone: values.contact_phone || null,
      contact_email: values.contact_email || null,
      indoor_outdoor: values.indoor_outdoor || null,
      preferred_contact_channel: values.preferred_contact_channel || null,
      source: values.source || null,
      notes: values.notes || null,
      available_days_times: (() => {
        const v = values.available_days_times?.trim();
        if (!v) return null;
        try {
          return JSON.parse(v);
        } catch {
          return { schedule: v };
        }
      })(),
    };

    try {
      const created = await apiPost<{ id: string; name: string }>(
        "/api/v1/admin/pools",
        payload,
        { auth: true },
      );
      toast.success(`Pool "${created.name}" created`);
      // Land on the edit page so admin can continue with contacts, visits, etc.
      router.push(`/admin/pools/${created.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create pool";
      setError(msg);
      toast.error(msg);
      throw e; // let PoolForm reset its busy state
    }
  };

  return (
    <div className="space-y-4">
      <Link
        href="/admin/pools"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to pools
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Waves className="w-6 h-6 text-cyan-600" />
          New Pool
        </h1>
        <p className="text-sm text-slate-500">
          Fill in the details below. After saving, you&rsquo;ll land on the pool&rsquo;s
          page where you can add contacts, visits, agreements, and photos/videos.
        </p>
      </div>

      {error && (
        <Alert variant="error" title="Could not create pool">
          {error}
        </Alert>
      )}

      {/* Tabs — only Details is active for a new pool */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => {
          const isDetails = key === "details";
          return (
            <button
              key={key}
              disabled={!isDetails}
              title={isDetails ? undefined : "Save the pool first to unlock this tab"}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                isDetails
                  ? "border-cyan-600 text-cyan-700"
                  : "border-transparent text-slate-300 cursor-not-allowed"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {!isDetails && <Lock className="h-3 w-3 ml-0.5" />}
            </button>
          );
        })}
      </div>

      <Card className="p-6 bg-white">
        <PoolForm
          mode="create"
          onSubmit={handleSave}
          onCancel={() => router.push("/admin/pools")}
          submitLabel="Save Pool"
        />
      </Card>
    </div>
  );
}
