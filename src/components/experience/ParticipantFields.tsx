"use client";

export type ParticipantDetails = { full_name: string; email: string; phone: string; emergency_contact_name: string; emergency_contact_phone: string; waiver_accepted: boolean };
export const blankParticipant = (): ParticipantDetails => ({full_name: "", email: "", phone: "", emergency_contact_name: "", emergency_contact_phone: "", waiver_accepted: false});

export function ParticipantFields({title, value, onChange}: {title: string; value: ParticipantDetails; onChange: (value: ParticipantDetails) => void}) {
  return <fieldset className="space-y-3 rounded-lg border border-slate-200 p-4"><legend className="px-1 font-semibold">{title}</legend>
    <div className="grid gap-3 sm:grid-cols-2">{([
      ["full_name", "Full name", "text", 2], ["email", "Email", "email", 3], ["phone", "Phone", "tel", 7],
      ["emergency_contact_name", "Emergency contact name", "text", 2], ["emergency_contact_phone", "Emergency contact phone", "tel", 7],
    ] as const).map(([key, label, type, min]) => <label key={key} className="text-sm">{label}<input required type={type} minLength={min} maxLength={key.includes("phone") ? 40 : key === "email" ? 254 : 160} value={value[key]} onChange={(e) => onChange({...value, [key]: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>)}</div>
    <label className="flex gap-2 text-sm"><input required type="checkbox" checked={value.waiver_accepted} onChange={(e) => onChange({...value, waiver_accepted: e.target.checked})} /><span>I confirm this participant’s details and permission to register them. They understand physical activities carry risks, will follow staff safety instructions and disclose relevant health needs before taking part. Emergency details may be used for this activity.</span></label>
  </fieldset>;
}
