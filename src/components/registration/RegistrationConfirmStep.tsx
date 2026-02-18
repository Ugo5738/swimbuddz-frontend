"use client";

interface RegistrationConfirmStepProps {
  selectedTier: string | null;
  firstName: string;
  lastName: string;
  email: string;
  acceptedTerms: boolean;
  onAcceptTerms: (accepted: boolean) => void;
}

function humanizeTier(tier: string | null) {
  if (!tier) return "";
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

export function RegistrationConfirmStep({
  selectedTier,
  firstName,
  lastName,
  email,
  acceptedTerms,
  onAcceptTerms,
}: RegistrationConfirmStepProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h4 className="mb-2 text-sm font-semibold text-slate-900">Summary</h4>
        <dl className="grid gap-2 text-sm">
          <div className="grid grid-cols-3 gap-2">
            <dt className="text-slate-600">Tier:</dt>
            <dd className="col-span-2 font-medium text-slate-900">
              {humanizeTier(selectedTier)}
            </dd>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <dt className="text-slate-600">Name:</dt>
            <dd className="col-span-2 font-medium text-slate-900">
              {firstName} {lastName}
            </dd>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <dt className="text-slate-600">Email:</dt>
            <dd className="col-span-2 font-medium text-slate-900">{email}</dd>
          </div>
        </dl>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h4 className="font-medium text-slate-900">Terms & Conditions</h4>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => onAcceptTerms(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
            required
          />
          <div>
            <span className="text-sm text-slate-900">
              I have read and agree to the{" "}
              <a
                href="/guidelines-and-rules"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-600 underline hover:text-cyan-700"
              >
                Guidelines and Rules
              </a>{" "}
              and{" "}
              <a
                href="/privacy"
                target="_blank"
                className="text-cyan-600 hover:text-cyan-700 hover:underline"
              >
                Privacy Policy
              </a>
              <span className="text-rose-500"> *</span>
            </span>
            <p className="mt-1 text-xs text-slate-600">
              By registering, you acknowledge that you've read and understood
              our community guidelines, safety protocols, and data handling
              practices.
            </p>
          </div>
        </label>
      </div>

      <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="font-semibold">What happens next?</p>
        <ul className="mt-2 space-y-1">
          <li>1) Confirm your email</li>
          <li>2) Log in (we’ll take you to your next step)</li>
          <li>
            3) Activate Community (₦20,000/year) to unlock member features
          </li>
          <li>
            4) If you chose Club/Academy: complete readiness, then pay when you
            activate Club or enroll in an Academy cohort
          </li>
        </ul>
        <p className="mt-2">
          <a
            href="/membership"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-emerald-900 underline"
          >
            Read the full membership flow
          </a>
        </p>
      </div>
    </div>
  );
}
