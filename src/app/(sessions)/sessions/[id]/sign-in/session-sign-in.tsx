"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { signInToSession } from "@/lib/sessions";
import { RideShareOption } from "@/lib/transport";
import type { Session } from "@/lib/sessions";

const mockMember = {
  name: "Ada Obi",
  email: "ada@example.com"
};

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<boolean>(false);

  const sessionDate = new Date(session.date);

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
        ride_share_option: rideShareOption,
        needs_ride: needsRide,
        can_offer_ride: canOfferRide,
        pickup_location: pickupLocation || undefined
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
          <p className="text-emerald-700">Your attendance has been recorded. Payment details will be shared by admin.</p>
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Pool fee</p>
            <p className="text-base font-semibold text-slate-900">₦{session.poolFee.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Ride-share</p>
            <p className="text-base font-semibold text-slate-900">
              {session.rideShareFee ? `₦${session.rideShareFee.toLocaleString()}` : "N/A"}
            </p>
          </div>
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

      <Card className="space-y-4">
        {step === 0 && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-900">Signing in as</h2>
            <p className="text-base text-slate-700">{mockMember.name}</p>
            <p className="text-sm text-slate-500">{mockMember.email}</p>
            <p className="text-xs text-amber-600">
              TODO: Gate this route by checking Supabase session and redirecting to /login if unauthenticated.
            </p>
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

        {step === 2 && (
          <div className="space-y-3 text-sm text-slate-700">
            <p>Review your selections and submit.</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Status:{" "}
                {status === "PRESENT" ? "Full session" : status === "LATE" ? "Arriving late" : "Leaving early"}
              </li>
              <li>
                Ride-share: {rideShareOption === RideShareOption.NONE ? "None" : rideShareOption === RideShareOption.LEAD ? "Lead carpool" : "Join carpool"}
              </li>
              {needsRide && <li>Needs ride: Yes</li>}
              {canOfferRide && <li>Can offer ride: Yes</li>}
              {pickupLocation && <li>Pickup: {pickupLocation}</li>}
              {note ? <li>Note: {note}</li> : null}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap justify-between gap-3">
          <Button type="button" variant="secondary" onClick={previousStep} disabled={step === 0 || saving}>
            Back
          </Button>
          <Button type="button" onClick={nextStep} disabled={saving}>
            {step === steps.length - 1 ? (saving ? "Submitting..." : "Submit sign-in") : "Next"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
