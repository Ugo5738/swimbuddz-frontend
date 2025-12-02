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
  { title: "Identity", description: "Confirm who is signing in." },
  { title: "Attendance", description: "Choose how you'll attend this session." },
  { title: "Options & submit", description: "Add notes, ride-share info, then confirm." }
];

type SessionSignInProps = {
  session: Session;
};

export function SessionSignIn({ session }: SessionSignInProps) {
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<"PRESENT" | "LATE" | "EARLY">("PRESENT");
  const [note, setNote] = useState("");
  const [rideShareOption, setRideShareOption] = useState<RideShareOption>(RideShareOption.NONE);
  const [needsRide, setNeedsRide] = useState(false);
  const [canOfferRide, setCanOfferRide] = useState(false);
  const [pickupLocation, setPickupLocation] = useState("");

  // New State for Ride Share Booking
  const [selectedRideShareAreaId, setSelectedRideShareAreaId] = useState<string | null>(null);
  const [selectedRideShareLocation, setSelectedRideShareLocation] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<boolean>(false);
  const [member, setMember] = useState<{ name: string; email: string } | null>(null);
  const [loadingMember, setLoadingMember] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const sessionDate = new Date(session.date);
  const hasRideShareAreas = session.rideShareAreas && session.rideShareAreas.length > 0;

  // Calculate total cost
  const selectedArea = session.rideShareAreas?.find(a => a.id === selectedRideShareAreaId);
  const rideShareCost = selectedArea ? selectedArea.cost : 0;
  const totalCost = session.poolFee + rideShareCost;

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
    if (step === 1 && hasRideShareAreas && !selectedRideShareAreaId && rideShareOption === RideShareOption.NONE) {
      // If ride share areas exist, we might want to prompt or just let them skip if they selected NONE
      // If they selected JOIN/LEAD in the old flow (which we might replace or keep as fallback), we handle it.
      // Let's assume if they didn't select an area, they are skipping ride share booking.
    }

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
        ride_share_option: rideShareOption,
        needs_ride: needsRide,
        can_offer_ride: canOfferRide,
        pickup_location: pickupLocation || undefined,
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
          {session.location} —{" "}
          {sessionDate.toLocaleDateString("en-NG", { weekday: "long", month: "short", day: "numeric" })},{" "}
          {session.startTime}–{session.endTime}
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
              <span>₦{session.poolFee.toLocaleString()}</span>
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

          <div className="mt-4 rounded bg-slate-50 p-3 text-sm">
            <p className="font-semibold">Bank Transfer</p>
            <p>Bank: GTBank</p>
            <p>Account: 0123456789</p>
            <p>Name: SwimBuddz</p>
            <p className="mt-2 text-xs text-slate-500">Please send receipt to admin via WhatsApp.</p>
          </div>

          <Button className="mt-4 w-full" disabled>Pay Online (Coming Soon)</Button>
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
          <p className="text-sm text-slate-600">{session.location}</p>
          <p className="text-sm font-semibold text-slate-700">
            {sessionDate.toLocaleDateString("en-NG", { weekday: "long", month: "short", day: "numeric" })} •{" "}
            {session.startTime} – {session.endTime}
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

            {hasRideShareAreas ? (
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
                      {area.departure_time && (
                        <p className="text-xs text-slate-500">Depart: {new Date(area.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      )}
                    </div>
                  ))}
                </div>

                {selectedRideShareAreaId && (
                  <div className="mt-4 space-y-2 rounded bg-slate-50 p-3">
                    <p className="text-sm font-medium text-slate-900">Select Pickup Location:</p>
                    <div className="space-y-2">
                      {session.rideShareAreas!.find(a => a.id === selectedRideShareAreaId)?.pickup_locations.map((loc) => (
                        <label key={loc.id} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="pickup_location"
                            value={loc.id}
                            checked={selectedRideShareLocation === loc.id}
                            onChange={(e) => setSelectedRideShareLocation(e.target.value)}
                            className="text-cyan-600 focus:ring-cyan-500"
                          />
                          <span className="text-sm text-slate-700">{loc.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Fallback to old simple ride share options if no areas configured
              <div className="space-y-4 border-t border-slate-200 pt-4">
                <Select
                  label="Ride-share option"
                  value={rideShareOption}
                  onChange={(event) => setRideShareOption(event.target.value as RideShareOption)}
                >
                  <option value={RideShareOption.NONE}>I'll get there myself</option>
                  <option value={RideShareOption.LEAD}>I can lead a carpool</option>
                  <option value={RideShareOption.JOIN}>I want to join a carpool</option>
                </Select>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={needsRide}
                      onChange={(e) => setNeedsRide(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700">I need a ride to the session</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={canOfferRide}
                      onChange={(e) => setCanOfferRide(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700">I can offer a ride to others</span>
                  </label>
                </div>
                <Input
                  label="Pickup location (optional)"
                  placeholder="e.g., Apple Junction, Ajegunle"
                  value={pickupLocation}
                  onChange={(event) => setPickupLocation(event.target.value)}
                />
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 text-sm text-slate-700">
            <p>Review your selections and submit.</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Status:{" "}
                {status === "PRESENT" ? "Full session" : status === "LATE" ? "Arriving late" : "Leaving early"}
              </li>
              {selectedArea ? (
                <>
                  <li>Ride Share: <span className="font-semibold">{selectedArea.ride_area_name}</span></li>
                  <li>Pickup: {selectedArea.pickup_locations.find(l => l.id === selectedRideShareLocation)?.name || "Not selected"}</li>
                  <li>Cost: ₦{selectedArea.cost.toLocaleString()}</li>
                </>
              ) : (
                <li>
                  Ride-share: {rideShareOption === RideShareOption.NONE ? "None" : rideShareOption === RideShareOption.LEAD ? "Lead carpool" : "Join carpool"}
                </li>
              )}
              {note ? <li>Note: {note}</li> : null}
            </ul>

            <div className="mt-4 border-t border-slate-200 pt-2">
              <div className="flex justify-between font-bold text-slate-900">
                <span>Total Estimated Cost:</span>
                <span>₦{totalCost.toLocaleString()}</span>
              </div>
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
