// Member admin — small presentational components extracted from page.tsx
// during the file-size sweep. All pure props-driven.

"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CheckCircle, Clock, XCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { EMPTY_FORM, MOBILE_CLR, TIER_CLR } from "./constants";
import type { Member } from "./types";
import { isPaid } from "./utils";

export function TierBadge({ t }: { t: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${TIER_CLR[t] || "bg-slate-100 text-slate-600"}`}
    >
      {t}
    </span>
  );
}

export function StatusBadge({ s }: { s: string }) {
  if (s === "approved")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
        <CheckCircle className="h-3 w-3" />
        Approved
      </span>
    );
  if (s === "rejected")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
        <XCircle className="h-3 w-3" />
        Rejected
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
      <Clock className="h-3 w-3" />
      Pending
    </span>
  );
}

export function PayText({ m }: { m: Member }) {
  const p = isPaid(m);
  return (
    <span className={`text-xs font-medium ${p ? "text-green-600" : "text-red-500"}`}>
      {p ? "Paid" : "Unpaid"}
    </span>
  );
}

export function Av({ m }: { m: Member }) {
  if (m.profile_photo_url)
    return (
      <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full inline-block">
        <Image
          src={m.profile_photo_url}
          alt=""
          fill
          sizes="32px"
          className="object-cover"
        />
      </span>
    );
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-xs font-semibold text-cyan-700">
      {(m.first_name[0] || "") + (m.last_name[0] || "")}
    </span>
  );
}

export function IBtn({
  children,
  href,
  title,
  className = "text-slate-500 hover:bg-slate-100",
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  href?: string;
  title: string;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const cls = `rounded p-1.5 transition ${className} disabled:opacity-40`;
  if (href)
    return (
      <Link href={href} className={cls} title={title}>
        {children}
      </Link>
    );
  return (
    <button onClick={onClick} className={cls} title={title} disabled={disabled}>
      {children}
    </button>
  );
}
export function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <Card className={`flex items-center gap-3 p-4 ${accent ? "ring-1 ring-amber-200" : ""}`}>
      {icon}
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </Card>
  );
}

export function KV({ k, v }: { k: string; v?: string | null }) {
  return (
    <div>
      <span className="text-slate-500">{k}</span>
      <p className="font-medium text-slate-900">{v || "N/A"}</p>
    </div>
  );
}


export function MobileBtn({
  children,
  href,
  onClick,
  color,
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  color?: string;
}) {
  const cls = `flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-medium transition ${color ? MOBILE_CLR[color] : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`;
  if (href)
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  return (
    <button onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

export function MemberForm({
  data,
  onChange,
  onSubmit,
  onCancel,
  submitting,
  label,
  isEdit,
  note,
}: {
  data: typeof EMPTY_FORM;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitting: boolean;
  label: string;
  isEdit?: boolean;
  note?: string;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="First Name"
          name="first_name"
          value={data.first_name}
          onChange={onChange}
          required
        />
        <Input
          label="Last Name"
          name="last_name"
          value={data.last_name}
          onChange={onChange}
          required
        />
      </div>
      <Input
        label="Email"
        type="email"
        name="email"
        value={data.email}
        onChange={onChange}
        required
        disabled={isEdit}
        hint={isEdit ? "Email cannot be changed" : undefined}
      />
      <Input label="Phone" type="tel" name="phone" value={data.phone} onChange={onChange} />
      <div className="grid grid-cols-2 gap-3">
        <Select label="Swim Level" name="swim_level" value={data.swim_level} onChange={onChange}>
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
          <option value="Pro">Pro</option>
        </Select>
        <Select
          label="Tier"
          name="membership_tier"
          value={data.membership_tier}
          onChange={onChange}
        >
          <option value="community">Community</option>
          <option value="club">Club</option>
          <option value="academy">Academy</option>
        </Select>
      </div>
      {isEdit && (
        <>
          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
            <Input label="City" name="city" value={data.city} onChange={onChange} />
            <Input label="Country" name="country" value={data.country} onChange={onChange} />
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
            <Input
              label="Emergency Name"
              name="emergency_contact_name"
              value={data.emergency_contact_name}
              onChange={onChange}
            />
            <Input
              label="Emergency Phone"
              name="emergency_contact_phone"
              value={data.emergency_contact_phone}
              onChange={onChange}
            />
          </div>
        </>
      )}
      {note && <p className="rounded bg-slate-50 p-2 text-xs text-slate-500">{note}</p>}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : label}
        </Button>
      </div>
    </form>
  );
}
