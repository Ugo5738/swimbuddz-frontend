import { Card } from "@/components/ui/Card";
import type { RideShareArea } from "@/lib/sessions";
import { Car, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

type RideShareSectionProps = {
  rideShareAreas: RideShareArea[];
  selectedRideAreaId: string | null;
  selectedPickupLocationId: string | null;
  numSeats: number;
  isRideOnlyFlow: boolean;
  formatCurrency: (amount: number) => string;
  onSelectRideArea: (areaId: string | null) => void;
  onSelectPickupLocation: (locationId: string | null) => void;
  onChangeSeats: (seats: number) => void;
};

export function RideShareSection({
  rideShareAreas,
  selectedRideAreaId,
  selectedPickupLocationId,
  numSeats,
  isRideOnlyFlow,
  formatCurrency,
  onSelectRideArea,
  onSelectPickupLocation,
  onChangeSeats,
}: RideShareSectionProps) {
  const [isExpanded, setIsExpanded] = useState(isRideOnlyFlow || !!selectedRideAreaId);

  const selectedArea = rideShareAreas.find((a) => a.id === selectedRideAreaId);
  const perSeatRideCost = selectedArea && selectedPickupLocationId ? selectedArea.cost : 0;

  // Collapsed state
  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white shadow-sm hover:border-slate-200 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-slate-100 p-2">
            <Car className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">Need a ride to the pool?</p>
            <p className="text-xs text-slate-400">
              {rideShareAreas.length} area
              {rideShareAreas.length !== 1 ? "s" : ""} available
            </p>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>
    );
  }

  // Expanded state
  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-cyan-50 p-2">
            <Car className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Ride Share</h2>
            <p className="text-xs text-slate-500">Select a pickup area to book a seat</p>
          </div>
        </div>
        {!isRideOnlyFlow && (
          <button
            type="button"
            onClick={() => {
              setIsExpanded(false);
              if (selectedRideAreaId) {
                onSelectRideArea(null);
                onSelectPickupLocation(null);
              }
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Collapse ride share"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Ride Areas */}
      <div className="grid gap-3 sm:grid-cols-2">
        {rideShareAreas.map((area) => (
          <div
            key={area.id}
            className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
              selectedRideAreaId === area.id
                ? "border-cyan-500 bg-cyan-50 ring-1 ring-cyan-500"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
            onClick={() => {
              if (selectedRideAreaId === area.id) {
                onSelectRideArea(null);
                onSelectPickupLocation(null);
              } else {
                onSelectRideArea(area.id);
                // Auto-select when there is exactly one available pickup location
                const availableLocs = area.pickup_locations.filter(
                  (loc) => loc.is_available && loc.current_bookings < loc.max_capacity
                );
                if (availableLocs.length === 1) {
                  onSelectPickupLocation(availableLocs[0].id);
                } else {
                  onSelectPickupLocation(null);
                }
              }
              onChangeSeats(1);
            }}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-slate-900">{area.ride_area_name}</p>
                <p className="text-xs text-slate-500">
                  {area.pickup_locations.length} pickup point
                  {area.pickup_locations.length !== 1 ? "s" : ""}
                </p>
              </div>
              <span className="font-semibold text-cyan-600">{formatCurrency(area.cost)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Pickup Locations */}
      {selectedRideAreaId && selectedArea && (
        <div className="rounded-xl bg-slate-50 p-4 space-y-3">
          <p className="text-sm font-medium text-slate-900">Select Pickup Location</p>
          <div className="grid gap-2">
            {selectedArea.pickup_locations.map((loc) => {
              const isSelected = selectedPickupLocationId === loc.id;
              const isFull = loc.current_bookings >= loc.max_capacity;
              const isDisabled = !loc.is_available || isFull;

              return (
                <div
                  key={loc.id}
                  className={`flex items-center justify-between rounded-lg border-2 p-3 transition-all ${
                    isDisabled
                      ? "border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed"
                      : isSelected
                        ? "border-cyan-500 bg-white ring-1 ring-cyan-500 cursor-pointer"
                        : "border-slate-200 bg-white hover:border-slate-300 cursor-pointer"
                  }`}
                  onClick={() => {
                    if (!isDisabled) {
                      onSelectPickupLocation(loc.id);
                      onChangeSeats(1);
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="pickup_location"
                      checked={isSelected}
                      readOnly
                      disabled={isDisabled}
                      className="h-4 w-4 border-slate-300 text-cyan-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{loc.name}</p>
                      {loc.description && (
                        <p className="text-xs text-slate-500">{loc.description}</p>
                      )}
                      {loc.departure_time_calculated && (
                        <p className="text-xs text-cyan-600 mt-1">
                          Departs:{" "}
                          {new Date(loc.departure_time_calculated).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        isDisabled
                          ? "bg-slate-200 text-slate-600"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {isDisabled
                        ? isFull
                          ? "Full"
                          : "Unavailable"
                        : `${loc.current_bookings}/${loc.max_capacity}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Seat Quantity Selector */}
      {selectedPickupLocationId && selectedArea && (
        <div className="rounded-xl bg-slate-50 p-4 space-y-3">
          <p className="text-sm font-medium text-slate-900">Number of Seats</p>
          <p className="text-xs text-slate-500">
            Booking for family or friends? Select how many seats you need.
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="w-10 h-10 rounded-lg border-2 border-slate-200 flex items-center justify-center text-lg font-bold disabled:opacity-30"
              onClick={() => onChangeSeats(Math.max(1, numSeats - 1))}
              disabled={numSeats <= 1}
            >
              −
            </button>
            <span className="text-2xl font-bold text-slate-900 w-8 text-center">{numSeats}</span>
            <button
              type="button"
              className="w-10 h-10 rounded-lg border-2 border-slate-200 flex items-center justify-center text-lg font-bold disabled:opacity-30"
              onClick={() => onChangeSeats(numSeats + 1)}
              disabled={numSeats >= (selectedArea?.capacity ?? 4)}
            >
              +
            </button>
            <span className="text-sm text-slate-500">
              {formatCurrency(perSeatRideCost)} per seat
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
