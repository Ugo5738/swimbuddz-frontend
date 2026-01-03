"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { signInToSession, RideShareOption } from "@/lib/sessions";
import type { Session } from "@/lib/sessions";
import { apiGet } from "@/lib/api";

const steps = [
  { title: "Identity", description: "Confirm who's attending." },
  { title: "Attendance & Ride", description: "Choose attendance type and ride options." },
  { title: "Review & Submit", description: "Review details and confirm sign-in." }
];

type SessionSignInProps = {
  session: Session;
};

export function SessionSignIn({ session }: SessionSignInProps) {
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<"PRESENT" | "LATE" | "EARLY">("PRESENT");
  const [note, setNote] = useState("");

  // New State for Ride Share Booking
  const [selectedRideShareAreaId, setSelectedRideShareAreaId] = useState<string | null>(null);
  const [selectedRideShareLocation, setSelectedRideShareLocation] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<boolean>(false);
  const [member, setMember] = useState<{ name: string; email: string } | null>(null);
  const [loadingMember, setLoadingMember] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Parse session times from starts_at/ends_at
  const startsAt = new Date(session.starts_at);
  const endsAt = new Date(session.ends_at);
  const startTime = startsAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const endTime = endsAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const hasRideShareAreas = session.rideShareAreas && session.rideShareAreas.length > 0;

  // Calculate total cost
  const selectedArea = session.rideShareAreas?.find(a => a.id === selectedRideShareAreaId);
  const rideShareCost = selectedArea ? selectedArea.cost : 0;
  const poolFee = session.pool_fee ?? 0;
  const totalCost = poolFee + rideShareCost;

  useEffect(() => {
    apiGet<any>("/api/v1/members/me", { auth: true })
      .then((profile) => {
        if (!profile) {
          setAuthError("Please sign in to continue.");
          return;
        }
        const fullName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.email;
        setMember({
          name: fullName,
          email: profile.email || ""
        });
      })
      .catch(() => {
        setAuthError("Please sign in to continue.");
      })
      .finally(() => setLoadingMember(false));
  }, []);

  function nextStep() {
    if (step < steps.length - 1) {
      setStep((current) => current + 1);
    } else {
      void handleSubmit();
    }
  }

  function previousStep() {
    if (step > 0) {
      setStep((current) => current - 1);
    }
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      await signInToSession({
        sessionId: session.id,
        status,
        notes: note || undefined,
        ride_config_id: selectedRideShareAreaId || undefined,
        pickup_location_id: selectedRideShareLocation || undefined,
      });
      setConfirmation(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign in. Please try again.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  if (confirmation) {
    return (
      <Card className="space-y-4">
        <h2 className="text-2xl font-semibold text-emerald-700">You're confirmed for {session.title}</h2>
        <p className="text-sm text-slate-600">
          {session.location_name ?? session.location} —{" "}
          {startsAt.toLocaleDateString("en-NG", { weekday: "long", month: "short", day: "numeric" })},{" "}
          {startTime}–{endTime}
        </p>
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm">
          <p className="font-semibold text-emerald-900">✓ Sign-in successful</p>
          <p className="text-emerald-700">Your attendance has been recorded.</p>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <h3 className="font-semibold text-slate-900">Payment Details</h3>
          <div className="mt-2 space-y-2 text-sm text-slate-700">
            <div className="flex justify-between">
              <span>Pool Fee:</span>
              <span>₦{poolFee.toLocaleString()}</span>
            </div>
            {selectedArea && (
              <div className="flex justify-between">
                <span>Ride Share ({selectedArea.ride_area_name}):</span>
                <span>₦{selectedArea.cost.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
              <span>Total to Pay:</span>
              <span>₦{totalCost.toLocaleString()}</span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-900">💳 Bank Transfer</p>
              <div className="mt-2 space-y-1 text-sm text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-600">Bank:</span>
                  <span className="font-medium">OPay</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Account Number:</span>
                  <span className="font-medium">7033588400</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Account Name:</span>
                  <span className="font-medium">Ugochukwu Nwachukwu</span>
                </div>
              </div>
              <div className="mt-3 rounded bg-cyan-50 p-3 text-sm">
                <p className="font-medium text-cyan-900">📱 Send Receipt via WhatsApp</p>
                <p className="mt-1 text-cyan-800">
                  After payment, please send your receipt to:{" "}
                  <a
                    href="https://wa.me/2347033588400"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline hover:text-cyan-600"
                  >
                    +234 703 358 8400
                  </a>
                </p>
              </div>
            </div>

            <Button className="w-full" variant="secondary" disabled>
              💳 Pay Online (Coming Soon)
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-cyan-600">Session</p>
          <h1 className="text-3xl font-bold text-slate-900">{session.title}</h1>
          <p className="text-sm text-slate-600">{session.location_name ?? session.location}</p>
          <p className="text-sm font-semibold text-slate-700">
            {startsAt.toLocaleDateString("en-NG", { weekday: "long", month: "short", day: "numeric" })} •{" "}
            {startTime} – {endTime}
          </p>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        {steps.map((item, index) => (
          <div
            key={item.title}
            className={`flex min-w-[150px] flex-col rounded-xl border px-3 py-2 text-sm ${index === step
              ? "border-cyan-600 bg-cyan-50 text-cyan-900"
              : index < step
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-white text-slate-500"
              }`}
          >
            <span className="text-xs font-semibold uppercase">Step {index + 1}</span>
            <span className="font-semibold">{item.title}</span>
            <span className="text-xs">{item.description}</span>
          </div>
        ))}
      </div>

      {error ? (
        <Alert variant="error" title="Sign-in error">
          {error}
        </Alert>
      ) : null}
      {authError ? (
        <Alert variant="error" title="Sign in required">
          {authError}
        </Alert>
      ) : null}

      <Card className="space-y-4">
        {step === 0 && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-900">Signing in as</h2>
            {loadingMember ? (
              <p className="text-sm text-slate-500">Loading profile...</p>
            ) : member ? (
              <>
                <p className="text-base text-slate-700">{member.name}</p>
                <p className="text-sm text-slate-500">{member.email}</p>
                <div className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50 p-3">
                  <p className="text-sm font-medium text-cyan-900">✨ Coming Soon</p>
                  <p className="mt-1 text-xs text-cyan-700">
                    Invite and book sessions with friends!
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-amber-700">
                We couldn't load your profile. Please sign in to continue.
              </p>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Select label="Attendance status" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
              <option value="PRESENT">Attend full session</option>
              <option value="LATE">Arriving late</option>
              <option value="EARLY">Leaving early</option>
            </Select>
            {status !== "PRESENT" ? (
              <Textarea
                label="Timing note"
                hint="Let coaches know when you'll arrive/leave."
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            ) : null}

            {hasRideShareAreas && (
              <div className="space-y-4 border-t border-slate-200 pt-4">
                <h3 className="font-semibold text-slate-900">Ride Share Options</h3>
                <p className="text-sm text-slate-600">Select a ride share area to book a seat.</p>

                <div className="grid gap-4 sm:grid-cols-2">
                  {session.rideShareAreas!.map((area) => (
                    <div
                      key={area.id}
                      className={`cursor-pointer rounded-lg border p-3 transition hover:border-cyan-500 ${selectedRideShareAreaId === area.id ? 'border-cyan-600 bg-cyan-50 ring-1 ring-cyan-600' : 'border-slate-200 bg-white'}`}
                      onClick={() => {
                        if (selectedRideShareAreaId === area.id) {
                          setSelectedRideShareAreaId(null);
                          setSelectedRideShareLocation(null);
                        } else {
                          setSelectedRideShareAreaId(area.id);
                          setSelectedRideShareLocation(null);
                        }
                      }}
                    >
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-900">{area.ride_area_name}</span>
                        <span className="font-medium text-slate-700">₦{area.cost.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-slate-500">Capacity: {area.capacity} per ride</p>
                    </div>
                  ))}
                </div>

                {selectedRideShareAreaId && (
                  <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-900">Select Pickup Location</p>
                      <span className="text-xs text-slate-500">
                        *Only one location per area can be active at a time
                      </span>
                    </div>
                    <div className="grid gap-3">
                      {session.rideShareAreas!.find(a => a.id === selectedRideShareAreaId)?.pickup_locations.map((loc) => {
                        const isSelected = selectedRideShareLocation === loc.id;
                        const isFull = loc.current_bookings >= loc.max_capacity;

                        return (
                          <label
                            key={loc.id}
                            className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border-2 transition-all ${!loc.is_available
                              ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60'
                              : isSelected
                                ? 'border-cyan-500 bg-gradient-to-br from-cyan-50 to-white shadow-lg shadow-cyan-100 ring-2 ring-cyan-200'
                                : 'border-slate-200 bg-white hover:border-cyan-300 hover:shadow-md'
                              }`}
                          >
                            {/* Header Section */}
                            <div className="flex items-start justify-between gap-4 p-4 pb-3">
                              <div className="flex items-start gap-3 flex-1">
                                <div className="mt-0.5">
                                  <input
                                    type="radio"
                                    name="pickup_location"
                                    value={loc.id}
                                    checked={isSelected}
                                    onChange={(e) => setSelectedRideShareLocation(e.target.value)}
                                    disabled={!loc.is_available}
                                    className="h-5 w-5 border-slate-300 text-cyan-600 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1 disabled:cursor-not-allowed"
                                  />
                                </div>
                                <div className="flex-1">
                                  <p className={`text-base font-semibold leading-tight ${!loc.is_available ? 'text-slate-500' : 'text-slate-900'}`}>
                                    📍 {loc.name}
                                  </p>
                                  {loc.description && (
                                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{loc.description}</p>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-2">
                                <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${!loc.is_available
                                  ? 'bg-slate-200 text-slate-700'
                                  : isFull
                                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                                    : loc.current_bookings > 0
                                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-white'
                                      : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white'
                                  }`}>
                                  {!loc.is_available
                                    ? '🚫 Inactive'
                                    : isFull
                                      ? '🚫 Full'
                                      : '✓ Available'}
                                </div>
                                <div className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${isSelected ? 'bg-white text-cyan-700' : 'bg-slate-100 text-slate-600'}`}>
                                  <span>👥</span>
                                  <span>{loc.current_bookings} / {loc.max_capacity}</span>
                                </div>
                              </div>
                            </div>

                            {/* Route Info Section */}
                            {loc.distance_text && (
                              <>
                                <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
                                <div className={`px-4 py-3 ${isSelected ? 'bg-cyan-50/50' : 'bg-slate-50'}`}>
                                  <div className="space-y-2.5 text-xs">
                                    <div className="flex items-baseline justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="text-base">🗺️</span>
                                        <span className="font-medium text-slate-700">Distance:</span>
                                      </div>
                                      <span className={`text-sm font-semibold ${isSelected ? 'text-cyan-600' : 'text-slate-900'}`}>
                                        {loc.distance_text} km
                                      </span>
                                    </div>
                                    <div className="flex items-baseline justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="text-base">⏱️</span>
                                        <span className="font-medium text-slate-700">Duration:</span>
                                      </div>
                                      <span className={`text-sm font-semibold ${isSelected ? 'text-cyan-600' : 'text-slate-900'}`}>
                                        {loc.duration_text} mins
                                      </span>
                                    </div>
                                    {loc.departure_time_calculated && (
                                      <div className="flex items-baseline justify-between border-t border-slate-200 pt-2.5">
                                        <div className="flex items-center gap-2">
                                          <span className="text-base">🚗</span>
                                          <span className="font-medium text-slate-700">Departure:</span>
                                        </div>
                                        <span className={`text-sm font-semibold ${isSelected ? 'text-cyan-600' : 'text-slate-900'}`}>
                                          {new Date(loc.departure_time_calculated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}

                            {/* Warning Message */}
                            {!loc.is_available && loc.current_bookings === 0 && (
                              <div className="px-4 pb-3 pt-2">
                                <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                                  <span>⚠️</span>
                                  <span className="font-medium">Another location in this area is active</span>
                                </div>
                              </div>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 text-sm text-slate-700">
            <p>Review your selections and submit.</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Status:{" "}
                {status === "PRESENT" ? "Full session" : status === "LATE" ? "Arriving late" : "Leaving early"}
              </li>
              {selectedArea && (
                <>
                  <li>Ride Share: <span className="font-semibold">{selectedArea.ride_area_name}</span></li>
                  <li>Pickup: {selectedArea.pickup_locations.find(l => l.id === selectedRideShareLocation)?.name || "Not selected"}</li>
                  {(() => {
                    const selectedLoc = selectedArea.pickup_locations.find(l => l.id === selectedRideShareLocation);
                    return selectedLoc?.distance_text ? (
                      <>
                        <li>Distance: {selectedLoc.distance_text} km</li>
                        <li>Duration: {selectedLoc.duration_text} mins</li>
                        {selectedLoc.departure_time_calculated && (
                          <>
                            <li>Departure: {new Date(selectedLoc.departure_time_calculated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</li>
                          </>
                        )}
                      </>
                    ) : null;
                  })()}
                </>
              )}
              {note ? <li>Note: {note}</li> : null}
            </ul>

            <div className="border-t border-slate-200 pt-4">
              <h3 className="font-semibold text-slate-900">Payment Breakdown</h3>
              <div className="mt-2 space-y-2 text-sm text-slate-700">
                <div className="flex justify-between">
                  <span>Pool Fee:</span>
                  <span>₦{poolFee.toLocaleString()}</span>
                </div>
                {selectedArea && (
                  <div className="flex justify-between">
                    <span>Ride Share ({selectedArea.ride_area_name}):</span>
                    <span>₦{selectedArea.cost.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900">
                  <span>Total to Pay:</span>
                  <span>₦{totalCost.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="font-semibold text-slate-900">💳 Bank Transfer Details</p>
                <div className="mt-2 space-y-1 text-sm text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Bank:</span>
                    <span className="font-medium">OPay</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Account Number:</span>
                    <span className="font-medium">7033588400</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Account Name:</span>
                    <span className="font-medium">Ugochukwu Nwachukwu</span>
                  </div>
                </div>
                <div className="mt-3 rounded bg-cyan-50 p-3 text-sm">
                  <p className="font-medium text-cyan-900">📱 Send Receipt via WhatsApp</p>
                  <p className="mt-1 text-cyan-800">
                    After payment, please send your receipt to:{" "}
                    <a
                      href="https://wa.me/2347033588400"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold underline hover:text-cyan-600"
                    >
                      +234 703 358 8400
                    </a>
                  </p>
                </div>
              </div>

              <Button className="w-full" variant="secondary" disabled>
                💳 Pay Online (Coming Soon)
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-between gap-3">
          <Button type="button" variant="secondary" onClick={previousStep} disabled={step === 0 || saving}>
            Back
          </Button>
          <Button type="button" onClick={nextStep} disabled={saving || (!!authError && step === 0)}>
            {step === steps.length - 1 ? (saving ? "Submitting..." : "Submit sign-in") : "Next"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
