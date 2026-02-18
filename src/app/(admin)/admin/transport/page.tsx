"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";

interface PickupLocation {
  id: string;
  name: string;
  description?: string;
  address?: string; // Exact street address
  latitude?: number; // GPS coordinates (optional)
  longitude?: number;
  is_active: boolean;
}
type RouteFormState = {
  destination: string;
  destination_name: string;
  distance_text: string;
  duration_text: string;
  departure_offset_minutes: number;
  route_id: string | null;
};
interface PickupLocationWithRoute extends PickupLocation {
  routes?: RouteApi[];
}
interface RouteApi {
  id: string;
  origin_area_id: string | null;
  origin_pickup_location_id: string | null;
  destination: string;
  destination_name: string;
  distance_text: string;
  duration_text: string;
  departure_offset_minutes: number;
}

interface RideArea {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  pickup_locations: PickupLocationWithRoute[];
}

const DEFAULT_DESTINATIONS = [
  "sunfit_pool",
  "rowe_park_pool",
  "federal_palace_pool",
  "open_water",
];

export default function AdminTransportPage() {
  const [areas, setAreas] = useState<RideArea[]>([]);
  const [routes, setRoutes] = useState<RouteApi[]>([]);
  const [destinationOptions, setDestinationOptions] =
    useState<string[]>(DEFAULT_DESTINATIONS);
  const [showCreateArea, setShowCreateArea] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const areasRes = await fetch(`${API_BASE_URL}/api/v1/transport/areas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!areasRes.ok) throw new Error("Failed to fetch areas");
      const areasData = await areasRes.json();

      let routesData: RouteApi[] = [];
      try {
        const routesRes = await fetch(
          `${API_BASE_URL}/api/v1/transport/routes`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (routesRes.ok) {
          routesData = await routesRes.json();
          setRoutes(routesData);
        } else {
          console.warn(
            "Routes endpoint unavailable, continuing without route data",
          );
          setRoutes([]);
        }
      } catch (routesErr) {
        console.warn(
          "Failed to load routes, continuing without route data",
          routesErr,
        );
        setRoutes([]);
      }
      const destinations = Array.from(
        new Set([
          ...DEFAULT_DESTINATIONS,
          ...routesData.map((r: RouteApi) => r.destination),
        ]),
      );
      setDestinationOptions(destinations);

      const augmented = areasData.map((area: RideArea) => ({
        ...area,
        pickup_locations: area.pickup_locations.map(
          (loc: PickupLocationWithRoute) => {
            const matches = routesData.filter(
              (r: RouteApi) => r.origin_pickup_location_id === loc.id,
            );
            return { ...loc, routes: matches };
          },
        ),
      }));
      setAreas(augmented);
    } catch (err) {
      console.error(err);
      setError("Failed to load ride areas");
    }
  };

  const fetchAreas = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${API_BASE_URL}/api/v1/transport/areas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch areas");
      const data = await res.json();
      // merge existing routes
      const augmented = data.map((area: RideArea) => ({
        ...area,
        pickup_locations: area.pickup_locations.map(
          (loc: PickupLocationWithRoute) => {
            const matches = routes.filter(
              (r) => r.origin_pickup_location_id === loc.id,
            );
            return { ...loc, routes: matches };
          },
        ),
      }));
      setAreas(augmented);
      const destinations = Array.from(
        new Set([...DEFAULT_DESTINATIONS, ...routes.map((r) => r.destination)]),
      );
      setDestinationOptions(destinations);
    } catch (err) {
      console.error(err);
      setError("Failed to load ride areas");
    }
  };

  const handleCreateArea = async (name: string, slug: string) => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${API_BASE_URL}/api/v1/transport/areas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, slug }),
      });

      if (!res.ok) throw new Error("Failed to create area");

      setShowCreateArea(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setError("Failed to create area");
    } finally {
      setLoading(false);
    }
  };

  const handleAddLocation = async (
    areaId: string,
    name: string,
    description?: string,
    address?: string,
  ) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(
        `${API_BASE_URL}/api/v1/transport/areas/${areaId}/locations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name, description, address }),
        },
      );

      if (!res.ok) throw new Error("Failed to add location");

      fetchData();
    } catch (err) {
      console.error(err);
      setError("Failed to add location");
    }
  };

  const handleUpdateArea = async (
    areaId: string,
    updates: { name?: string; slug?: string },
  ) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(
        `${API_BASE_URL}/api/v1/transport/areas/${areaId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updates),
        },
      );

      if (!res.ok) throw new Error("Failed to update area");
      fetchData();
    } catch (err) {
      console.error(err);
      setError("Failed to update area");
    }
  };

  const upsertRouteForPickup = async (
    pickupId: string,
    route?: RouteFormState,
  ) => {
    if (!route) return;
    const hasValues =
      route.destination ||
      route.destination_name ||
      route.distance_text ||
      route.duration_text;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (route.route_id && !hasValues) {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/transport/routes/${route.route_id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) throw new Error("Failed to delete route");
      return;
    }

    if (route.route_id) {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/transport/routes/${route.route_id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            origin_pickup_location_id: pickupId,
            destination: route.destination,
            destination_name: route.destination_name,
            distance_text: route.distance_text,
            duration_text: route.duration_text,
            departure_offset_minutes: route.departure_offset_minutes,
          }),
        },
      );
      if (!res.ok) throw new Error("Failed to update route");
      return;
    }

    if (hasValues) {
      const res = await fetch(`${API_BASE_URL}/api/v1/transport/routes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          origin_pickup_location_id: pickupId,
          destination: route.destination,
          destination_name: route.destination_name,
          distance_text: route.distance_text,
          duration_text: route.duration_text,
          departure_offset_minutes: route.departure_offset_minutes,
        }),
      });
      if (!res.ok) throw new Error("Failed to create route");
    }
  };

  const handleUpdateLocation = async (
    locationId: string,
    updates: { name?: string; description?: string; route?: RouteFormState },
  ) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(
        `${API_BASE_URL}/api/v1/transport/locations/${locationId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: updates.name,
            description: updates.description,
          }),
        },
      );

      if (!res.ok) throw new Error("Failed to update pickup location");
      await upsertRouteForPickup(locationId, updates.route);
      fetchData();
    } catch (err) {
      console.error(err);
      setError("Failed to update pickup location");
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm("Delete this pickup location?")) return;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(
        `${API_BASE_URL}/api/v1/transport/locations/${locationId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!res.ok) throw new Error("Failed to delete pickup location");
      fetchData();
    } catch (err) {
      console.error(err);
      setError("Failed to delete pickup location");
    }
  };

  const handleDeleteArea = async (areaId: string) => {
    if (!confirm("Are you sure you want to delete this ride area?")) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(
        `${API_BASE_URL}/api/v1/transport/areas/${areaId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!res.ok) throw new Error("Failed to delete area");
      fetchAreas();
    } catch (err) {
      console.error(err);
      setError("Failed to delete area");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-600">
            Admin · Transport
          </p>
          <h1 className="text-4xl font-bold text-slate-900">
            Transport Management
          </h1>
          <p className="text-slate-600 mt-2">
            Manage ride share areas and pickup locations
          </p>
        </div>
        <Link href="/admin/transport/new">
          <Button>+ Create Ride Area</Button>
        </Link>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid gap-6">
        {areas.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-slate-500">
              No ride areas configured yet. Create one to get started!
            </p>
          </Card>
        ) : (
          areas.map((area) => (
            <RideAreaCard
              key={area.id}
              area={area}
              onAddLocation={handleAddLocation}
              onUpdateArea={handleUpdateArea}
              onUpdateLocation={handleUpdateLocation}
              onDeleteLocation={handleDeleteLocation}
              onDelete={handleDeleteArea}
              destinationOptions={destinationOptions}
              onUpsertRoute={upsertRouteForPickup}
              onRefresh={fetchData}
            />
          ))
        )}
      </div>

      {showCreateArea && (
        <CreateAreaModal
          onClose={() => setShowCreateArea(false)}
          onCreate={handleCreateArea}
          loading={loading}
        />
      )}
    </div>
  );
}

function RideAreaCard({
  area,
  onAddLocation,
  onUpdateArea,
  onUpdateLocation,
  onDeleteLocation,
  onDelete,
  destinationOptions,
  onUpsertRoute,
  onRefresh,
}: {
  area: RideArea;
  onAddLocation: (
    areaId: string,
    name: string,
    description?: string,
    address?: string,
  ) => void;
  onUpdateArea: (
    areaId: string,
    updates: { name?: string; slug?: string },
  ) => void;
  onUpdateLocation: (
    locationId: string,
    updates: { name?: string; description?: string; route?: RouteFormState },
  ) => void;
  onDeleteLocation: (locationId: string) => void;
  onDelete: (areaId: string) => void;
  destinationOptions: string[];
  onUpsertRoute: (pickupId: string, route?: RouteFormState) => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [locationName, setLocationName] = useState("");
  const [locationDesc, setLocationDesc] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [editingArea, setEditingArea] = useState(false);
  const [areaName, setAreaName] = useState(area.name);
  const [areaSlug, setAreaSlug] = useState(area.slug);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(
    null,
  );
  const [locationEditName, setLocationEditName] = useState("");
  const [locationEditDesc, setLocationEditDesc] = useState("");
  const [locationRoute, setLocationRoute] = useState<RouteFormState>({
    destination: "",
    destination_name: "",
    distance_text: "",
    duration_text: "",
    departure_offset_minutes: 120,
    route_id: null,
  });
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [showRouteForm, setShowRouteForm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddLocation(
      area.id,
      locationName,
      locationDesc,
      locationAddress || undefined,
    );
    setLocationName("");
    setLocationDesc("");
    setLocationAddress("");
    setShowAddLocation(false);
  };

  const handleAreaSave = () => {
    onUpdateArea(area.id, { name: areaName, slug: areaSlug });
    setEditingArea(false);
  };

  const startEditLocation = (loc: PickupLocationWithRoute) => {
    setEditingLocationId(loc.id);
    setLocationEditName(loc.name);
    setLocationEditDesc(loc.description || "");
    setEditingRouteId(null);
    setLocationRoute({
      destination: "",
      destination_name: "",
      distance_text: "",
      duration_text: "",
      departure_offset_minutes: 120,
      route_id: null,
    });
  };

  const handleLocationSave = () => {
    if (!editingLocationId) return;
    onUpdateLocation(editingLocationId, {
      name: locationEditName,
      description: locationEditDesc,
    });
    setEditingLocationId(null);
    setLocationEditName("");
    setLocationEditDesc("");
    setLocationRoute({
      destination: "",
      destination_name: "",
      distance_text: "",
      duration_text: "",
      departure_offset_minutes: 120,
      route_id: null,
    });
    setEditingRouteId(null);
  };

  const handleRouteSave = async (pickupId: string) => {
    if (!pickupId) return;
    await onUpsertRoute(pickupId, locationRoute);
    await onRefresh();
    setLocationRoute({
      destination: "",
      destination_name: "",
      distance_text: "",
      duration_text: "",
      departure_offset_minutes: 120,
      route_id: null,
    });
    setEditingRouteId(null);
    setShowRouteForm(false);
  };

  const handleRouteEdit = (route: RouteApi) => {
    setEditingRouteId(route.id);
    setLocationRoute({
      destination: route.destination,
      destination_name: route.destination_name,
      distance_text: route.distance_text,
      duration_text: route.duration_text,
      departure_offset_minutes: route.departure_offset_minutes,
      route_id: route.id,
    });
    setShowRouteForm(true);
  };

  const handleRouteDelete = async (pickupId: string, routeId: string) => {
    await onUpsertRoute(pickupId, {
      destination: "",
      destination_name: "",
      distance_text: "",
      duration_text: "",
      departure_offset_minutes: 0,
      route_id: routeId,
    });
    await onRefresh();
    setEditingRouteId(null);
    setLocationRoute({
      destination: "",
      destination_name: "",
      distance_text: "",
      duration_text: "",
      departure_offset_minutes: 120,
      route_id: null,
    });
    setShowRouteForm(false);
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          {editingArea ? (
            <div className="space-y-2">
              <Input
                value={areaName}
                onChange={(e) => setAreaName(e.target.value)}
                placeholder="Area name"
              />
              <Input
                value={areaSlug}
                onChange={(e) => setAreaSlug(e.target.value)}
                placeholder="Slug"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAreaSave}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setEditingArea(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-slate-900">{area.name}</h2>
              <p className="text-sm text-slate-500">Slug: {area.slug}</p>
            </>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditingArea((v) => !v)}
          >
            {editingArea ? "Close" : "Edit Area"}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onDelete(area.id)}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-slate-900">
            Pickup Locations
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddLocation(!showAddLocation)}
          >
            + Add Location
          </Button>
        </div>

        {showAddLocation && (
          <Card className="p-4 mb-4 bg-slate-50">
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                placeholder="Location name (e.g., Gate 1)"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                required
              />
              <Input
                placeholder="Description (optional)"
                value={locationDesc}
                onChange={(e) => setLocationDesc(e.target.value)}
              />
              <Input
                placeholder="Street address (optional)"
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm">
                  Add
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAddLocation(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        <ul className="space-y-2">
          {area.pickup_locations.map((loc) => (
            <li
              key={loc.id}
              className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200"
            >
              {editingLocationId === loc.id ? (
                <div className="space-y-3">
                  <Input
                    value={locationEditName}
                    onChange={(e) => setLocationEditName(e.target.value)}
                    placeholder="Location name"
                  />
                  <Input
                    value={locationEditDesc}
                    onChange={(e) => setLocationEditDesc(e.target.value)}
                    placeholder="Description"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleLocationSave}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditingLocationId(null);
                        setLocationRoute({
                          destination: "",
                          destination_name: "",
                          distance_text: "",
                          duration_text: "",
                          departure_offset_minutes: 120,
                          route_id: null,
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-800">
                        Routes
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowRouteForm((v) => !v)}
                      >
                        {showRouteForm ? "Hide Route Form" : "Add Route"}
                      </Button>
                    </div>
                    {loc.routes && loc.routes.length > 0 ? (
                      <div className="space-y-2">
                        {loc.routes.map((route) => (
                          <div
                            key={route.id}
                            className="flex justify-between items-center rounded border border-slate-200 bg-white p-2"
                          >
                            <div className="text-xs text-slate-700">
                              {route.distance_text} • {route.duration_text} •
                              Leave {route.departure_offset_minutes} mins before
                              to {route.destination_name} ({route.destination})
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRouteEdit(route)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  handleRouteDelete(loc.id, route.id)
                                }
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500">
                        No routes for this pickup.
                      </div>
                    )}
                    {showRouteForm && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                          <div>
                            <label className="block text-sm text-slate-700 mb-1">
                              Destination
                            </label>
                            <input
                              className="w-full rounded border border-slate-300 p-2"
                              value={locationRoute.destination}
                              onChange={(e) =>
                                setLocationRoute({
                                  ...locationRoute,
                                  destination: e.target.value,
                                })
                              }
                              placeholder="e.g. sunfit_pool"
                              list={`destinations-${area.id}`}
                            />
                            <datalist id={`destinations-${area.id}`}>
                              {destinationOptions.map((opt) => (
                                <option key={opt} value={opt} />
                              ))}
                            </datalist>
                          </div>
                          <div>
                            <label className="block text-sm text-slate-700 mb-1">
                              Destination Name
                            </label>
                            <Input
                              value={locationRoute.destination_name}
                              onChange={(e) =>
                                setLocationRoute({
                                  ...locationRoute,
                                  destination_name: e.target.value,
                                })
                              }
                              placeholder="Display name"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-slate-700 mb-1">
                              Distance
                            </label>
                            <Input
                              value={locationRoute.distance_text}
                              onChange={(e) =>
                                setLocationRoute({
                                  ...locationRoute,
                                  distance_text: e.target.value,
                                })
                              }
                              placeholder="e.g. 14.0 km"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-slate-700 mb-1">
                              Duration
                            </label>
                            <Input
                              value={locationRoute.duration_text}
                              onChange={(e) =>
                                setLocationRoute({
                                  ...locationRoute,
                                  duration_text: e.target.value,
                                })
                              }
                              placeholder="e.g. 45 mins"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-slate-700 mb-1">
                              Departure Offset (mins)
                            </label>
                            <Input
                              type="number"
                              value={locationRoute.departure_offset_minutes}
                              onChange={(e) =>
                                setLocationRoute({
                                  ...locationRoute,
                                  departure_offset_minutes:
                                    parseInt(e.target.value, 10) || 0,
                                })
                              }
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleRouteSave(loc.id)}
                          >
                            {editingRouteId ? "Update Route" : "Save Route"}
                          </Button>
                          {editingRouteId && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setEditingRouteId(null);
                                setLocationRoute({
                                  destination: "",
                                  destination_name: "",
                                  distance_text: "",
                                  duration_text: "",
                                  departure_offset_minutes: 120,
                                  route_id: null,
                                });
                                setShowRouteForm(false);
                              }}
                            >
                              Cancel Route Edit
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-slate-900">
                      {loc.name}
                    </span>
                    {loc.description && (
                      <span className="text-sm text-slate-600 ml-2">
                        — {loc.description}
                      </span>
                    )}
                    {loc.routes && loc.routes.length > 0 && (
                      <div className="space-y-1 mt-1">
                        {loc.routes.map((route) => (
                          <div
                            key={route.id}
                            className="text-xs text-slate-600"
                          >
                            {route.distance_text} • {route.duration_text} •
                            Leave {route.departure_offset_minutes} mins before
                            to {route.destination_name} ({route.destination})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        startEditLocation(loc as PickupLocationWithRoute)
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onDeleteLocation(loc.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
          {area.pickup_locations.length === 0 && (
            <li className="text-slate-500 italic text-center py-4">
              No pickup locations yet
            </li>
          )}
        </ul>
      </div>
    </Card>
  );
}

function CreateAreaModal({
  onClose,
  onCreate,
  loading,
}: {
  onClose: () => void;
  onCreate: (name: string, slug: string) => void;
  loading: boolean;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(name, slug);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    setSlug(newName.toLowerCase().replace(/\s+/g, "_"));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6">
        <h2 className="text-2xl font-bold mb-4 text-slate-900">
          Create Ride Area
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Area Name
            </label>
            <Input
              value={name}
              onChange={handleNameChange}
              required
              placeholder="e.g., Lekki Axis"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Slug
            </label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              placeholder="e.g., lekki_axis"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
