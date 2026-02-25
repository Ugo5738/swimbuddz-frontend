"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

interface Session {
  id: string;
  title: string;
  session_type?:
    | "club"
    | "academy"
    | "community"
    | "cohort_class"
    | "one_on_one"
    | "group_booking"
    | "event";
  location: string;
  starts_at: string; // API returns starts_at, not start_time
  ends_at: string; // API returns ends_at, not end_time
  pool_fee: number;
  capacity: number;
  description?: string;
}

// Edit Session Form Component

export function EditSessionForm({
  session,
  onClose,
  onUpdate,
}: {
  session: Session;
  onClose: () => void;
  onUpdate: (sessionId: string, data: any) => void;
}) {
  const formatDateTimeLocal = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [formData, setFormData] = useState({
    title: session.title,
    type: session.session_type || "club", // Map from session_type back to type for form
    location: session.location,
    start_time: formatDateTimeLocal(session.starts_at), // Map from starts_at to start_time for form
    end_time: formatDateTimeLocal(session.ends_at), // Map from ends_at to end_time for form
    pool_fee: session.pool_fee,
    capacity: session.capacity,
    description: session.description || "",
  });

  const [availableAreas, setAvailableAreas] = useState<any[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<
    Array<{
      ride_area_id: string;
      cost: number;
      capacity: number;
      departure_time: string;
    }>
  >([]);
  const [loadingRideConfigs, setLoadingRideConfigs] = useState(true);

  useEffect(() => {
    fetchAvailableAreas();
    fetchCurrentRideConfigs();
  }, []);

  const fetchAvailableAreas = async () => {
    try {
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();
      const token = authSession?.access_token;

      const res = await fetch(`${API_BASE_URL}/api/v1/transport/areas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const areas = await res.json();
        setAvailableAreas(areas);
      }
    } catch (err) {
      console.error("Failed to fetch ride areas", err);
    }
  };

  const fetchCurrentRideConfigs = async () => {
    try {
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();
      const token = authSession?.access_token;

      const res = await fetch(
        `${API_BASE_URL}/api/v1/transport/sessions/${session.id}/ride-configs`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        const configs = await res.json();
        // Map existing configs to editable format
        const mapped = configs.map((config: any) => ({
          ride_area_id: config.ride_area_id,
          cost: config.cost,
          capacity: config.capacity,
          departure_time: config.departure_time
            ? formatDateTimeLocal(config.departure_time)
            : formatDateTimeLocal(
                new Date(
                  new Date(formData.start_time).getTime() - 2 * 60 * 60 * 1000,
                ).toISOString(),
              ),
        }));
        setSelectedAreas(mapped);
      }
    } catch (err) {
      console.error("Failed to fetch current ride configs", err);
    } finally {
      setLoadingRideConfigs(false);
    }
  };

  const addAreaConfig = () => {
    setSelectedAreas([
      ...selectedAreas,
      {
        ride_area_id: "",
        cost: 1000,
        capacity: 4,
        departure_time: formatDateTimeLocal(
          new Date(
            new Date(formData.start_time).getTime() - 2 * 60 * 60 * 1000,
          ).toISOString(),
        ),
      },
    ]);
  };

  const removeAreaConfig = (index: number) => {
    const newConfigs = [...selectedAreas];
    newConfigs.splice(index, 1);
    setSelectedAreas(newConfigs);
  };

  const updateAreaConfig = (index: number, field: string, value: any) => {
    const newConfigs = [...selectedAreas];
    newConfigs[index] = { ...selectedAreas[index], [field]: value };
    setSelectedAreas(newConfigs);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Separate session data from ride configs
    const { start_time, end_time, type, location, ...restFormData } = formData;
    const sessionData = {
      ...restFormData,
      session_type: type, // Keep as lowercase (club, academy, community)
      location: location, // Keep as lowercase snake_case (sunfit_pool, rowe_park_pool)
      starts_at: new Date(start_time).toISOString(),
      ends_at: new Date(end_time).toISOString(),
    };

    // Process ride configs
    const rideConfigs = selectedAreas
      .filter((config) => config.ride_area_id) // Only include configs with selected area
      .map((config) => ({
        ride_area_id: config.ride_area_id,
        cost: parseFloat(config.cost as any) || 0,
        capacity: parseInt(config.capacity as any) || 4,
        departure_time: config.departure_time
          ? new Date(config.departure_time).toISOString()
          : null,
      }));

    // Pass both separately to onUpdate
    onUpdate(session.id, {
      session: sessionData,
      ride_configs: rideConfigs,
    });
  };

  if (loadingRideConfigs) {
    return (
      <Modal isOpen={true} onClose={onClose} title="Edit Session">
        <p className="text-slate-600">Loading session data...</p>
      </Modal>
    );
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit Session">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Session type"
            value={formData.type}
            onChange={(e) =>
              setFormData({ ...formData, type: e.target.value as any })
            }
          >
            <option value="club">Club</option>
            <option value="academy">Academy</option>
            <option value="community">Community</option>
          </Select>
          <Select
            label="Location"
            value={formData.location}
            onChange={(e) =>
              setFormData({ ...formData, location: e.target.value })
            }
          >
            <option value="sunfit_pool">Sunfit Pool</option>
            <option value="rowe_park_pool">Rowe Park Pool</option>
            <option value="federal_palace_pool">Federal Palace Pool</option>
            <option value="open_water">Open Water</option>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Time"
            type="datetime-local"
            value={formData.start_time}
            onChange={(e) =>
              setFormData({ ...formData, start_time: e.target.value })
            }
            required
          />
          <Input
            label="End Time"
            type="datetime-local"
            value={formData.end_time}
            onChange={(e) =>
              setFormData({ ...formData, end_time: e.target.value })
            }
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Pool Fee (₦)"
            type="number"
            value={formData.pool_fee}
            onChange={(e) =>
              setFormData({ ...formData, pool_fee: parseInt(e.target.value) })
            }
            required
          />
          <Input
            label="Capacity"
            type="number"
            value={formData.capacity}
            onChange={(e) =>
              setFormData({ ...formData, capacity: parseInt(e.target.value) })
            }
            required
          />
        </div>
        <Textarea
          label="Description (optional)"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />

        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium">
              Ride Share Options
            </label>
            <button
              type="button"
              onClick={addAreaConfig}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              + Add Ride Area
            </button>
          </div>

          {selectedAreas.map((config, index) => (
            <div key={index} className="mb-4 p-4 border rounded bg-gray-50">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Ride Area {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeAreaConfig(index)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Select Area"
                  value={config.ride_area_id}
                  onChange={(e) =>
                    updateAreaConfig(index, "ride_area_id", e.target.value)
                  }
                  required
                >
                  <option value="">-- Select Ride Area --</option>
                  {availableAreas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name} ({area.pickup_locations.length} locations)
                    </option>
                  ))}
                </Select>
                <Input
                  label="Cost (₦)"
                  type="number"
                  value={config.cost}
                  onChange={(e) =>
                    updateAreaConfig(index, "cost", parseFloat(e.target.value))
                  }
                  required
                />
                <Input
                  label="Capacity (seats)"
                  type="number"
                  value={config.capacity}
                  onChange={(e) =>
                    updateAreaConfig(
                      index,
                      "capacity",
                      parseInt(e.target.value),
                    )
                  }
                  required
                />
                <Input
                  label="Departure Time"
                  type="datetime-local"
                  value={config.departure_time}
                  onChange={(e) =>
                    updateAreaConfig(index, "departure_time", e.target.value)
                  }
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Update Session</Button>
        </div>
      </form>
    </Modal>
  );
}
