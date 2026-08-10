"use client";

import { LocationOperationsNav } from "@/components/admin/LocationOperationsNav";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { apiGet, apiPost } from "@/lib/api";
import { formatOperatingAreaPath, PoolPricingApi, type OperatingArea } from "@/lib/poolPricing";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface PickupLocationInput {
  name: string;
  description: string;
  address: string;
}

interface RideArea {
  id: string;
  operating_area_id: string | null;
}

const EMPTY_PICKUP: PickupLocationInput = { name: "", description: "", address: "" };

export default function NewRideAreaPage() {
  const router = useRouter();
  const [areas, setAreas] = useState<OperatingArea[]>([]);
  const [configuredAreaIds, setConfiguredAreaIds] = useState<Set<string>>(new Set());
  const [operatingAreaId, setOperatingAreaId] = useState("");
  const [pickupLocations, setPickupLocations] = useState<PickupLocationInput[]>([]);
  const [pickup, setPickup] = useState<PickupLocationInput>(EMPTY_PICKUP);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void Promise.all([
      PoolPricingApi.listAreas(),
      apiGet<RideArea[]>("/api/v1/transport/areas", { auth: true }),
    ])
      .then(([operatingAreas, rideAreas]) => {
        setAreas(operatingAreas);
        setConfiguredAreaIds(
          new Set(
            rideAreas
              .map((area) => area.operating_area_id)
              .filter((id): id is string => Boolean(id))
          )
        );
      })
      .catch((cause) => {
        setError(cause instanceof Error ? cause.message : "Locations could not be loaded");
      })
      .finally(() => setLoading(false));
  }, []);

  const availableAreas = useMemo(
    () => areas.filter((area) => area.is_active && !configuredAreaIds.has(area.id)),
    [areas, configuredAreaIds]
  );
  const addPickup = () => {
    if (!pickup.name.trim()) {
      setError("Pickup location name is required");
      return;
    }
    setPickupLocations((current) => [...current, { ...pickup, name: pickup.name.trim() }]);
    setPickup(EMPTY_PICKUP);
    setError("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!operatingAreaId) {
      setError("Select an operating area");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const rideArea = await apiPost<{ id: string }>(
        "/api/v1/transport/areas",
        { operating_area_id: operatingAreaId },
        { auth: true }
      );
      await Promise.all(
        pickupLocations.map((location) =>
          apiPost(
            `/api/v1/transport/areas/${rideArea.id}/locations`,
            {
              name: location.name,
              description: location.description || null,
              address: location.address || null,
            },
            { auth: true }
          )
        )
      );
      router.push("/admin/transport");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ride-share area could not be created");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <LocationOperationsNav />
      <Link
        href="/admin/transport"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to ride share
      </Link>

      <header>
        <p className="text-xs font-semibold uppercase text-cyan-700">Location operations</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Enable ride share for an area</h1>
        <p className="mt-1 text-sm text-slate-600">
          Areas come from the same hierarchy used by pools and costing. Add only the pickup points
          that are specific to transport.
        </p>
      </header>

      {error && <Alert variant="error">{error}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card className="space-y-4 p-6">
          <Select
            label="Operating area"
            value={operatingAreaId}
            onChange={(event) => setOperatingAreaId(event.target.value)}
            disabled={loading}
            required
          >
            <option value="">{loading ? "Loading areas…" : "Select area"}</option>
            {availableAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {formatOperatingAreaPath(area, areas)}
              </option>
            ))}
          </Select>
          <p className="text-xs text-slate-500">
            Create or reorganize the geography under Areas &amp; costing. Ride share references it;
            it does not create a second copy.
          </p>
        </Card>

        <Card className="space-y-4 p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Pickup locations</h2>
            <p className="text-sm text-slate-600">
              Exact places where riders can meet the vehicle.
            </p>
          </div>

          {pickupLocations.length > 0 && (
            <ul className="divide-y divide-slate-100 border-y border-slate-200">
              {pickupLocations.map((location, index) => (
                <li
                  key={`${location.name}-${index}`}
                  className="flex items-start justify-between gap-3 py-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">{location.name}</p>
                    {location.description && (
                      <p className="text-sm text-slate-600">{location.description}</p>
                    )}
                    {location.address && (
                      <p className="text-xs text-slate-500">{location.address}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setPickupLocations((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index)
                      )
                    }
                    className="rounded p-2 text-rose-600 hover:bg-rose-50"
                    aria-label={`Remove ${location.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            <Input
              label="Pickup name"
              value={pickup.name}
              onChange={(event) => setPickup({ ...pickup, name: event.target.value })}
              placeholder="e.g. Tejuosho main entrance"
            />
            <Input
              label="Description"
              value={pickup.description}
              onChange={(event) => setPickup({ ...pickup, description: event.target.value })}
              placeholder="Optional landmark"
            />
            <Input
              label="Exact address"
              value={pickup.address}
              onChange={(event) => setPickup({ ...pickup, address: event.target.value })}
              placeholder="Optional street address"
            />
          </div>
          <Button type="button" variant="outline" onClick={addPickup}>
            <Plus className="mr-2 h-4 w-4" />
            Add pickup
          </Button>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/admin/transport">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving || loading || availableAreas.length === 0}>
            {saving ? "Saving…" : "Enable ride share"}
          </Button>
        </div>
      </form>
    </div>
  );
}
