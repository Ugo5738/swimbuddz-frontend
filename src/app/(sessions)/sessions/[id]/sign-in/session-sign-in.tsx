"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { signInToSession } from "@/lib/sessions";
import type { Session } from "../../data";

const mockMember = {
  name: "Ada Obi",
  email: "ada@example.com"
};

const steps = [
  { title: "Identity", description: "Confirm who is signing in." },
  { title: "Attendance", description: "Choose how you’ll attend this session." },
  { title: "Options & submit", description: "Add notes, ride-share info, then confirm." }
];

const paymentInstructions = {
  accountName: "SwimBuddz Collective",
  accountNumber: "0123456789",
  bank: "GTBank",
  referencePrefix: "SB"
};

type SessionSignInProps = {
  session: Session;
};

export function SessionSignIn({ session }: SessionSignInProps) {
  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState<"full" | "late" | "early">("full");
  const [note, setNote] = useState("");
  const [rideShareRole, setRideShareRole] = useState<"none" | "passenger" | "driver">("none");
  const [rideShareSeats, setRideShareSeats] = useState("1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ reference: string } | null>(null);

  const sessionDate = new Date(session.date);
  const reference = `${paymentInstructions.referencePrefix}-${session.id.toUpperCase()}`;

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
        plan,
        note: note || undefined,
        rideShareRole,
        rideShareSeats: rideShareRole === "driver" ? Number(rideShareSeats) || 1 : undefined
      });
      setConfirmation({ reference });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign in. Please try again.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  if (confirmation) {
    const total = session.poolFee + (session.rideShareFee ?? 0);
    return (
      <Card className="space-y-4">
        <h2 className="text-2xl font-semibold text-emerald-700">You’re confirmed for {session.title}</h2>
        <p className="text-sm text-slate-600">
          {session.location} —{" "}
          {sessionDate.toLocaleDateString("en-NG", { weekday: "long", month: "short", day: "numeric" })},{" "}
          {session.startTime}–{session.endTime}
        </p>
        <div className="space-y-1 text-sm">
          <p>Pool fee: ₦{session.poolFee.toLocaleString()}</p>
          {session.rideShareFee ? <p>Ride-share fee: ₦{session.rideShareFee.toLocaleString()}</p> : null}
          <p className="font-semibold">Total: ₦{total.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
          <p className="font-semibold text-slate-900">Payment instructions</p>
          <p>Account name: {paymentInstructions.accountName}</p>
          <p>
            Account number: {paymentInstructions.accountNumber} ({paymentInstructions.bank})
          </p>
          <p>
            Payment reference: <span className="font-semibold">{confirmation.reference}</span>
          </p>
        </div>
        <p className="text-xs text-slate-500">
          Show payment proof to admins after transfer to get confirmed in attendance.
        </p>
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
            className={`flex min-w-[150px] flex-col rounded-xl border px-3 py-2 text-sm ${
              index === step
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
            <Select label="Attendance plan" value={plan} onChange={(event) => setPlan(event.target.value as typeof plan)}>
              <option value="full">Attend full session</option>
              <option value="late">Arriving late</option>
              <option value="early">Leaving early</option>
            </Select>
            {plan !== "full" ? (
              <Textarea
                label="Timing note"
                hint="Let coaches know when you’ll arrive/leave."
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            ) : null}
            <Select
              label="Ride-share option"
              value={rideShareRole}
              onChange={(event) => setRideShareRole(event.target.value as typeof rideShareRole)}
            >
              <option value="none">I’ll get there myself</option>
              <option value="passenger">I need a ride</option>
              <option value="driver">I can drive and take others</option>
            </Select>
            {rideShareRole === "driver" ? (
              <Input
                label="Seats available"
                type="number"
                min={1}
                value={rideShareSeats}
                onChange={(event) => setRideShareSeats(event.target.value)}
              />
            ) : null}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 text-sm text-slate-700">
            <p>Review your selections and submit. The backend call will create/overwrite your attendance record.</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Plan:{" "}
                {plan === "full" ? "Full session" : plan === "late" ? "Arriving late" : "Leaving early"}
              </li>
              <li>
                Ride-share:{" "}
                {rideShareRole === "none"
                  ? "No ride-share"
                  : rideShareRole === "passenger"
                    ? "Needs a ride"
                    : `Driver with ${rideShareSeats} seat(s)`}
              </li>
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
