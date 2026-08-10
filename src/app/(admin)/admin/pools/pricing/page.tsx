"use client";

import { LocationOperationsNav } from "@/components/admin/LocationOperationsNav";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { Select } from "@/components/ui/Select";
import { apiGet } from "@/lib/api";
import {
  type ActivityScope,
  type AreaType,
  type ChargeBasis,
  type OperatingArea,
  type OperatingCostRate,
  PoolPricingApi,
  type PoolRate,
} from "@/lib/poolPricing";
import { Pencil, Power, Save, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Tab = "areas" | "pool" | "cost";
type PoolOption = { id: string; name: string };
type PoolList = { items: PoolOption[] };

const today = new Date().toISOString().slice(0, 10);
const emptyArea = {
  name: "",
  slug: "",
  area_type: "locality" as AreaType,
  parent_id: null as string | null,
  country_code: "NG",
  timezone: "Africa/Lagos",
  currency: "NGN",
  is_active: true,
};

const emptyRate = {
  activity_scope: "all" as ActivityScope,
  charge_basis: "per_attendee" as ChargeBasis,
  amount_naira: 0,
  currency: "NGN",
  effective_from: today,
  effective_to: null as string | null,
  day_of_week: null as number | null,
  starts_after: null as string | null,
  ends_before: null as string | null,
  minimum_quantity: 1,
  notes: null as string | null,
  is_active: true,
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function PoolPricingPage() {
  const [tab, setTab] = useState<Tab>("areas");
  const [areas, setAreas] = useState<OperatingArea[]>([]);
  const [pools, setPools] = useState<PoolOption[]>([]);
  const [poolRates, setPoolRates] = useState<PoolRate[]>([]);
  const [costRates, setCostRates] = useState<OperatingCostRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [areaForm, setAreaForm] = useState(emptyArea);
  const [areaId, setAreaId] = useState<string | null>(null);
  const [poolRateForm, setPoolRateForm] = useState({
    ...emptyRate,
    pool_id: "",
    description: "",
  });
  const [poolRateId, setPoolRateId] = useState<string | null>(null);
  const [costRateForm, setCostRateForm] = useState({
    ...emptyRate,
    category: "refreshment",
    description: "Light post-swim refreshment",
    scope_type: "area" as "global" | "area" | "pool",
    operating_area_id: null as string | null,
    pool_id: null as string | null,
    supplier_name: "",
  });
  const [costRateId, setCostRateId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [areaRows, poolRows, facilityRates, operatingRates] = await Promise.all([
        PoolPricingApi.listAreas(true),
        apiGet<PoolList>("/api/v1/admin/pools?page_size=100", { auth: true }),
        PoolPricingApi.listPoolRates(),
        PoolPricingApi.listCostRates(),
      ]);
      setAreas(areaRows);
      setPools(poolRows.items);
      setPoolRates(facilityRates);
      setCostRates(operatingRates);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Pricing data failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const areaNames = useMemo(() => new Map(areas.map((area) => [area.id, area.name])), [areas]);
  const poolNames = useMemo(() => new Map(pools.map((pool) => [pool.id, pool.name])), [pools]);

  const saveArea = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (areaId) {
        await PoolPricingApi.updateArea(areaId, areaForm);
      } else {
        await PoolPricingApi.createArea(areaForm);
      }
      toast.success(areaId ? "Operating area updated" : "Operating area added");
      setAreaId(null);
      setAreaForm(emptyArea);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Area could not be saved");
    }
  };

  const savePoolRate = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (poolRateId) {
        await PoolPricingApi.updatePoolRate(poolRateId, poolRateForm);
      } else {
        await PoolPricingApi.createPoolRate(poolRateForm);
      }
      toast.success(poolRateId ? "Pool rate updated" : "Pool rate added");
      setPoolRateId(null);
      setPoolRateForm({ ...emptyRate, pool_id: "", description: "" });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Pool rate could not be saved");
    }
  };

  const saveCostRate = async (event: React.FormEvent) => {
    event.preventDefault();
    const { scope_type, ...fields } = costRateForm;
    const payload = {
      ...fields,
      operating_area_id: scope_type === "area" ? fields.operating_area_id : null,
      pool_id: scope_type === "pool" ? fields.pool_id : null,
      supplier_name: fields.supplier_name || null,
    };
    try {
      if (costRateId) {
        await PoolPricingApi.updateCostRate(costRateId, payload);
      } else {
        await PoolPricingApi.createCostRate(payload);
      }
      toast.success(costRateId ? "Operating cost updated" : "Operating cost added");
      setCostRateId(null);
      setCostRateForm({
        ...emptyRate,
        category: "refreshment",
        description: "Light post-swim refreshment",
        scope_type: "area",
        operating_area_id: null,
        pool_id: null,
        supplier_name: "",
      });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cost rate could not be saved");
    }
  };

  if (loading) return <LoadingPage text="Loading cost catalogue..." />;

  return (
    <div className="space-y-6">
      <LocationOperationsNav />
      <header>
        <p className="text-xs font-semibold uppercase text-cyan-700">Pool operations</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-950">Areas and Cost Rates</h1>
        <p className="mt-1 text-sm text-slate-600">
          Configure effective pool and operating costs. Sessions snapshot these suggestions and may
          still be adjusted before publication.
        </p>
      </header>

      <div className="flex gap-1 border-b border-slate-200">
        {[
          ["areas", "Operating areas"],
          ["pool", "Pool rates"],
          ["cost", "Operating costs"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value as Tab)}
            className={`border-b-2 px-4 py-3 text-sm font-medium ${
              tab === value ? "border-cyan-700 text-cyan-800" : "border-transparent text-slate-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "areas" ? (
        <>
          <form
            onSubmit={saveArea}
            className="grid gap-3 border-y border-slate-200 py-4 md:grid-cols-3"
          >
            <Input
              label="Name"
              value={areaForm.name}
              onChange={(event) =>
                setAreaForm({
                  ...areaForm,
                  name: event.target.value,
                  slug: areaId ? areaForm.slug : slugify(event.target.value),
                })
              }
              required
            />
            <Input
              label="Slug"
              value={areaForm.slug}
              onChange={(event) => setAreaForm({ ...areaForm, slug: event.target.value })}
              required
            />
            <Select
              label="Area type"
              value={areaForm.area_type}
              onChange={(event) =>
                setAreaForm({ ...areaForm, area_type: event.target.value as AreaType })
              }
            >
              <option value="country">Country</option>
              <option value="market">Market / city</option>
              <option value="commercial_band">Commercial band</option>
              <option value="locality">Locality</option>
            </Select>
            <Select
              label="Parent area"
              value={areaForm.parent_id ?? ""}
              onChange={(event) =>
                setAreaForm({
                  ...areaForm,
                  parent_id: event.target.value || null,
                })
              }
            >
              <option value="">Top level</option>
              {areas
                .filter((area) => area.id !== areaId)
                .map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
            </Select>
            <Input
              label="Country"
              value={areaForm.country_code}
              onChange={(event) => setAreaForm({ ...areaForm, country_code: event.target.value })}
            />
            <Input
              label="Timezone"
              value={areaForm.timezone}
              onChange={(event) => setAreaForm({ ...areaForm, timezone: event.target.value })}
            />
            <Input
              label="Currency"
              value={areaForm.currency}
              onChange={(event) => setAreaForm({ ...areaForm, currency: event.target.value })}
            />
            <FormActions
              editing={Boolean(areaId)}
              onCancel={() => {
                setAreaId(null);
                setAreaForm(emptyArea);
              }}
            />
          </form>
          <DataTable
            headings={["Area", "Type", "Parent", "Timezone", "Status", ""]}
            rows={areas.map((area) => [
              area.name,
              area.area_type.replace("_", " "),
              area.parent_id ? (areaNames.get(area.parent_id) ?? "Unknown") : "Top level",
              area.timezone,
              area.is_active ? "Active" : "Inactive",
              <RowActions
                key={area.id}
                onEdit={() => {
                  setAreaId(area.id);
                  setAreaForm({
                    name: area.name,
                    slug: area.slug,
                    area_type: area.area_type,
                    parent_id: area.parent_id,
                    country_code: area.country_code,
                    timezone: area.timezone,
                    currency: area.currency,
                    is_active: area.is_active,
                  });
                }}
                onDeactivate={() => void PoolPricingApi.deactivateArea(area.id).then(load)}
              />,
            ])}
          />
        </>
      ) : null}

      {tab === "pool" ? (
        <>
          <form
            onSubmit={savePoolRate}
            className="grid gap-3 border-y border-slate-200 py-4 md:grid-cols-4"
          >
            <Select
              label="Pool"
              value={poolRateForm.pool_id}
              onChange={(event) =>
                setPoolRateForm({ ...poolRateForm, pool_id: event.target.value })
              }
              required
            >
              <option value="">Select pool</option>
              {pools.map((pool) => (
                <option key={pool.id} value={pool.id}>
                  {pool.name}
                </option>
              ))}
            </Select>
            <RateFields value={poolRateForm} onChange={setPoolRateForm} />
            <Input
              label="Description"
              value={poolRateForm.description ?? ""}
              onChange={(event) =>
                setPoolRateForm({ ...poolRateForm, description: event.target.value })
              }
              placeholder="Saturday lane fee"
            />
            <FormActions
              editing={Boolean(poolRateId)}
              onCancel={() => {
                setPoolRateId(null);
                setPoolRateForm({ ...emptyRate, pool_id: "", description: "" });
              }}
            />
          </form>
          <DataTable
            headings={["Pool", "Activity", "Basis", "Amount", "Effective", ""]}
            rows={poolRates.map((rate) => [
              poolNames.get(rate.pool_id) ?? "Unknown pool",
              rate.activity_scope,
              rate.charge_basis.replaceAll("_", " "),
              `₦${rate.amount_naira.toLocaleString()}`,
              `${rate.effective_from}${rate.effective_to ? ` to ${rate.effective_to}` : "+"}`,
              <RowActions
                key={rate.id}
                onEdit={() => {
                  setPoolRateId(rate.id);
                  setPoolRateForm({ ...rate, description: rate.description ?? "" });
                }}
                onDeactivate={() => void PoolPricingApi.deactivatePoolRate(rate.id).then(load)}
              />,
            ])}
          />
        </>
      ) : null}

      {tab === "cost" ? (
        <>
          <form
            onSubmit={saveCostRate}
            className="grid gap-3 border-y border-slate-200 py-4 md:grid-cols-4"
          >
            <Input
              label="Category"
              value={costRateForm.category}
              onChange={(event) =>
                setCostRateForm({ ...costRateForm, category: event.target.value })
              }
              required
            />
            <Input
              label="Description"
              value={costRateForm.description}
              onChange={(event) =>
                setCostRateForm({ ...costRateForm, description: event.target.value })
              }
              required
            />
            <Select
              label="Applies at"
              value={costRateForm.scope_type}
              onChange={(event) =>
                setCostRateForm({
                  ...costRateForm,
                  scope_type: event.target.value as "global" | "area" | "pool",
                })
              }
            >
              <option value="global">Global default</option>
              <option value="area">Operating area</option>
              <option value="pool">Specific pool</option>
            </Select>
            {costRateForm.scope_type === "area" ? (
              <Select
                label="Area"
                value={costRateForm.operating_area_id ?? ""}
                onChange={(event) =>
                  setCostRateForm({
                    ...costRateForm,
                    operating_area_id: event.target.value || null,
                  })
                }
                required
              >
                <option value="">Select area</option>
                {areas
                  .filter((area) => area.is_active)
                  .map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
              </Select>
            ) : costRateForm.scope_type === "pool" ? (
              <Select
                label="Pool"
                value={costRateForm.pool_id ?? ""}
                onChange={(event) =>
                  setCostRateForm({ ...costRateForm, pool_id: event.target.value || null })
                }
                required
              >
                <option value="">Select pool</option>
                {pools.map((pool) => (
                  <option key={pool.id} value={pool.id}>
                    {pool.name}
                  </option>
                ))}
              </Select>
            ) : (
              <div />
            )}
            <RateFields value={costRateForm} onChange={setCostRateForm} />
            <Input
              label="Supplier"
              value={costRateForm.supplier_name}
              onChange={(event) =>
                setCostRateForm({ ...costRateForm, supplier_name: event.target.value })
              }
            />
            <FormActions
              editing={Boolean(costRateId)}
              onCancel={() => {
                setCostRateId(null);
                setCostRateForm({
                  ...emptyRate,
                  category: "refreshment",
                  description: "Light post-swim refreshment",
                  scope_type: "area",
                  operating_area_id: null,
                  pool_id: null,
                  supplier_name: "",
                });
              }}
            />
          </form>
          <DataTable
            headings={["Cost", "Scope", "Activity", "Basis", "Amount", ""]}
            rows={costRates.map((rate) => [
              rate.description,
              rate.pool_id
                ? (poolNames.get(rate.pool_id) ?? "Pool")
                : rate.operating_area_id
                  ? (areaNames.get(rate.operating_area_id) ?? "Area")
                  : "Global",
              rate.activity_scope,
              rate.charge_basis.replaceAll("_", " "),
              `₦${rate.amount_naira.toLocaleString()}`,
              <RowActions
                key={rate.id}
                onEdit={() => {
                  setCostRateId(rate.id);
                  setCostRateForm({
                    ...rate,
                    scope_type: rate.pool_id ? "pool" : rate.operating_area_id ? "area" : "global",
                    supplier_name: rate.supplier_name ?? "",
                  });
                }}
                onDeactivate={() => void PoolPricingApi.deactivateCostRate(rate.id).then(load)}
              />,
            ])}
          />
        </>
      ) : null}
    </div>
  );
}

function RateFields<T extends typeof emptyRate>({
  value,
  onChange,
}: {
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <>
      <Select
        label="Activity"
        value={value.activity_scope}
        onChange={(event) =>
          onChange({ ...value, activity_scope: event.target.value as ActivityScope })
        }
      >
        <option value="all">All activities</option>
        <option value="community">Community</option>
        <option value="club">Club</option>
        <option value="academy">Academy</option>
      </Select>
      <Select
        label="Charge basis"
        value={value.charge_basis}
        onChange={(event) =>
          onChange({ ...value, charge_basis: event.target.value as ChargeBasis })
        }
      >
        <option value="per_attendee">Per attendee</option>
        <option value="per_staff">Per staff</option>
        <option value="per_hour">Per hour</option>
        <option value="per_lane">Per lane</option>
        <option value="flat_session">Flat session</option>
      </Select>
      <Input
        label="Amount (₦)"
        type="number"
        min={0}
        value={value.amount_naira}
        onChange={(event) => onChange({ ...value, amount_naira: Number(event.target.value) })}
        required
      />
      <Input
        label="Effective from"
        type="date"
        value={value.effective_from}
        onChange={(event) => onChange({ ...value, effective_from: event.target.value })}
        required
      />
      <Input
        label="Effective to"
        type="date"
        value={value.effective_to ?? ""}
        onChange={(event) => onChange({ ...value, effective_to: event.target.value || null })}
      />
      <Select
        label="Day"
        value={value.day_of_week ?? ""}
        onChange={(event) =>
          onChange({
            ...value,
            day_of_week: event.target.value === "" ? null : Number(event.target.value),
          })
        }
      >
        <option value="">Any day</option>
        <option value="0">Monday</option>
        <option value="1">Tuesday</option>
        <option value="2">Wednesday</option>
        <option value="3">Thursday</option>
        <option value="4">Friday</option>
        <option value="5">Saturday</option>
        <option value="6">Sunday</option>
      </Select>
      <Input
        label="Starts after"
        type="time"
        value={value.starts_after ?? ""}
        onChange={(event) => onChange({ ...value, starts_after: event.target.value || null })}
      />
      <Input
        label="Ends before"
        type="time"
        value={value.ends_before ?? ""}
        onChange={(event) => onChange({ ...value, ends_before: event.target.value || null })}
      />
      <Input
        label="Minimum quantity"
        type="number"
        min={1}
        value={value.minimum_quantity}
        onChange={(event) =>
          onChange({ ...value, minimum_quantity: Math.max(Number(event.target.value) || 1, 1) })
        }
      />
      <Input
        label="Notes"
        value={value.notes ?? ""}
        onChange={(event) => onChange({ ...value, notes: event.target.value || null })}
      />
    </>
  );
}

function FormActions({ editing, onCancel }: { editing: boolean; onCancel: () => void }) {
  return (
    <div className="flex items-end gap-2">
      <Button type="submit">
        <Save className="mr-2 h-4 w-4" />
        {editing ? "Update" : "Add"}
      </Button>
      {editing ? (
        <Button type="button" variant="secondary" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}

function RowActions({ onEdit, onDeactivate }: { onEdit: () => void; onDeactivate: () => void }) {
  return (
    <div className="flex justify-end gap-1">
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-slate-100"
        title="Edit"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onDeactivate}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-red-600 hover:bg-red-50"
        title="Deactivate"
      >
        <Power className="h-4 w-4" />
      </button>
    </div>
  );
}

function DataTable({ headings, rows }: { headings: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto border-y border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            {headings.map((heading) => (
              <th key={heading} className="px-3 py-3">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-3 text-slate-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
