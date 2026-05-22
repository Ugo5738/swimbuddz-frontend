"use client";

import { TimezoneCombobox } from "@/components/forms/TimezoneCombobox";
import { RegistrationEssentialsStep } from "@/components/registration/RegistrationEssentialsStep";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { uploadMedia } from "@/lib/media";
import { Camera, Loader2, X } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

type CoreFormState = {
  firstName: string;
  lastName: string;
  phone: string;
  areaInLagos: string;
  city: string;
  state: string;
  country: string;
  gender: string;
  dateOfBirth: string;
  profilePhotoUrl: string;
  profilePhotoMediaId: string;
  timeZone: string;
};

type Props = {
  coreForm: CoreFormState;
  setCoreForm: React.Dispatch<React.SetStateAction<CoreFormState>>;
  saving: boolean;
  setSaving: (saving: boolean) => void;
};

export function CoreStep({ coreForm, setCoreForm, saving, setSaving }: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-900">Core profile</h2>
        <p className="text-sm text-slate-600">
          Basic identity and contact details so we can support you safely.
        </p>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">
          Profile photo <span className="text-rose-500">*</span>
        </label>
        <div className="flex items-center gap-6">
          <label className="relative group cursor-pointer">
            <div
              className={[
                "relative h-24 w-24 overflow-hidden rounded-full transition-all",
                coreForm.profilePhotoUrl
                  ? "ring-4 ring-cyan-200"
                  : "bg-gradient-to-br from-cyan-100 to-cyan-200 hover:from-cyan-200 hover:to-cyan-300",
              ].join(" ")}
            >
              {coreForm.profilePhotoUrl ? (
                <Image
                  src={coreForm.profilePhotoUrl}
                  alt="Profile preview"
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-cyan-700">
                  {saving ? (
                    <Loader2 className="h-7 w-7 animate-spin" />
                  ) : (
                    <>
                      <Camera className="h-7 w-7" />
                      <span className="text-xs font-medium">Add photo</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={saving}
              onChange={async (event) => {
                const input = event.currentTarget;
                const file = input.files?.[0];
                if (!file) return;
                input.value = "";

                setSaving(true);
                try {
                  const mediaItem = await uploadMedia(file, "profile_photo");
                  setCoreForm((prev) => ({
                    ...prev,
                    profilePhotoMediaId: mediaItem.id,
                    profilePhotoUrl: mediaItem.file_url,
                  }));
                  toast.success("Photo uploaded!");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to upload photo");
                } finally {
                  setSaving(false);
                }
              }}
            />
            {coreForm.profilePhotoUrl && !saving ? (
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
                <Camera className="h-8 w-8 text-white" />
              </div>
            ) : null}
          </label>
          <div className="flex-1 space-y-2">
            <p className="text-sm text-slate-700 font-medium">
              {coreForm.profilePhotoUrl ? "Tap to change photo" : "Tap the circle to upload"}
            </p>
            <p className="text-xs text-slate-500">
              JPG/PNG/GIF. This helps members recognize you.
            </p>
            {coreForm.profilePhotoUrl ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setCoreForm((prev) => ({
                    ...prev,
                    profilePhotoMediaId: "",
                    profilePhotoUrl: "",
                  }))
                }
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Remove photo
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <RegistrationEssentialsStep
        mode="onboarding"
        includeSwimLevel={false}
        includeAcquisitionSource={false}
        formData={{
          firstName: coreForm.firstName,
          lastName: coreForm.lastName,
          phone: coreForm.phone,
          city: coreForm.city,
          state: coreForm.state,
          country: coreForm.country,
        }}
        onUpdate={(field, value) => setCoreForm((prev) => ({ ...prev, [field]: value }))}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Select
          label="Gender"
          name="gender"
          value={coreForm.gender}
          onChange={(e) => setCoreForm((prev) => ({ ...prev, gender: e.target.value }))}
          required
        >
          <option value="">Select gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </Select>

        <Input
          label="Date of birth"
          name="dateOfBirth"
          type="date"
          value={coreForm.dateOfBirth}
          onChange={(e) =>
            setCoreForm((prev) => ({
              ...prev,
              dateOfBirth: e.target.value,
            }))
          }
          required
        />
      </div>

      <TimezoneCombobox
        label="Time zone"
        value={coreForm.timeZone}
        onChange={(value) => setCoreForm((prev) => ({ ...prev, timeZone: value }))}
        required
        name="timeZone"
      />
    </div>
  );
}
