"use client";

// Client-side intake form for the public /corporate landing page.
//
// Posts to /api/v1/corporate/leads (no auth). Honeypot field is a hidden
// text input named "website" — bots that auto-fill all inputs trip it; we
// keep the success state identical to a real submission so they can't tell.
//
// Rendered inside the server-component page; isolated so the rest of the
// page can stay static + cacheable.

import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

import { corporateApi } from "@/lib/corporate/api";

type Status = "idle" | "submitting" | "success" | "error";

const EMPLOYEE_COUNT_OPTIONS = [
  { value: "", label: "Pick one (helps us reply faster)" },
  { value: "5", label: "1-5 employees" },
  { value: "10", label: "5-15 employees (recommended pilot size)" },
  { value: "30", label: "15-50 employees" },
  { value: "100", label: "50+ employees" },
];

export function CorporateLeadForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    const employeeCountRaw = String(formData.get("employee_count") || "").trim();

    const body = {
      company_name: String(formData.get("company_name") || "").trim(),
      primary_contact_name: String(formData.get("primary_contact_name") || "").trim(),
      primary_contact_email: String(formData.get("primary_contact_email") || "").trim(),
      employee_count: employeeCountRaw ? Number(employeeCountRaw) : null,
      message: String(formData.get("message") || "").trim() || null,
      website: String(formData.get("website") || ""), // honeypot
    };

    setStatus("submitting");
    setError(null);

    try {
      const res = await corporateApi.submitLead(body);
      setSuccessMessage(res.message);
      setStatus("success");
      form.reset();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Try emailing swimbuddz@gmail.com instead.";
      setError(message);
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-emerald-600" />
          <div>
            <p className="font-medium">Got it — thank you.</p>
            <p className="mt-1 text-sm text-emerald-800">
              {successMessage ||
                "We've received your enquiry and will be in touch within one working day."}
            </p>
            <p className="mt-3 text-sm text-emerald-700">
              In the meantime, feel free to read{" "}
              <a
                href="https://swimbuddz.com/about"
                className="underline underline-offset-2"
              >
                more about SwimBuddz
              </a>{" "}
              or reach out directly at{" "}
              <a
                href="mailto:swimbuddz@gmail.com"
                className="underline underline-offset-2"
              >
                swimbuddz@gmail.com
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {/* Honeypot — visually hidden, accessibility-hidden, but still in the DOM
       * so naive bots that fill every input trip it. */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
        <label>
          Website
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
      </div>

      <div>
        <label
          htmlFor="company_name"
          className="block text-sm font-medium text-slate-700"
        >
          Company name
        </label>
        <input
          id="company_name"
          name="company_name"
          type="text"
          required
          maxLength={255}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          placeholder="Acme Tech"
        />
      </div>

      <div>
        <label
          htmlFor="primary_contact_name"
          className="block text-sm font-medium text-slate-700"
        >
          Your name
        </label>
        <input
          id="primary_contact_name"
          name="primary_contact_name"
          type="text"
          required
          maxLength={255}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          placeholder="Jane Doe"
          autoComplete="name"
        />
      </div>

      <div>
        <label
          htmlFor="primary_contact_email"
          className="block text-sm font-medium text-slate-700"
        >
          Work email
        </label>
        <input
          id="primary_contact_email"
          name="primary_contact_email"
          type="email"
          required
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          placeholder="jane@acme.com"
          autoComplete="email"
        />
      </div>

      <div>
        <label
          htmlFor="employee_count"
          className="block text-sm font-medium text-slate-700"
        >
          Approximate cohort size
        </label>
        <select
          id="employee_count"
          name="employee_count"
          defaultValue=""
          className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          {EMPLOYEE_COUNT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="message"
          className="block text-sm font-medium text-slate-700"
        >
          Anything specific to share? <span className="text-slate-400">(optional)</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          maxLength={2000}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          placeholder="Timing, location preferences, internal champion, anything else useful."
        />
      </div>

      {status === "error" && error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
      >
        {status === "submitting" ? "Sending…" : "Request a 20-min intro call"}
        {status !== "submitting" && <ArrowRight className="h-4 w-4" />}
      </button>

      <p className="text-xs text-slate-500">
        We reply within one working day. No drip campaigns, no sales chase.
      </p>
    </form>
  );
}
