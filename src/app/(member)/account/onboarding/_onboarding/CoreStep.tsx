"use client";

import { TimezoneCombobox } from "@/components/forms/TimezoneCombobox";
import { RegistrationEssentialsStep } from "@/components/registration/RegistrationEssentialsStep";
import { Button } from "@/components/ui/Button";
import { ImageCropDialog } from "@/components/ui/ImageCropDialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { uploadAdjustedImage } from "@/lib/media";
import type { ImageTransformRecipe } from "@/lib/mediaCrop";
import { Camera, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
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
  const [pendingPhoto, setPendingPhoto] = useState<{
    file: File;
    objectUrl: string;
  } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [photoError, setPhotoError] = useState<string | null>(null);\n  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (pendingPhoto) URL.revokeObjectURL(pendingPhoto.objectUrl);
    },
    [pendingPhoto]
  );

  const closePhotoAdjustment = () => {
    if (pendingPhoto) URL.revokeObjectURL(pendingPhoto.objectUrl);
    setPendingPhoto(null);
    setPhotoError(null);
  };

  const saveAdjustedPhoto = async (recipe: ImageTransformRecipe) => {
    if (!pendingPhoto) return;
    setUploadProgress(0);
    setSaving(true);
    setPhotoError(null);
    try {
      const mediaItem = await uploadAdjustedImage(pendingPhoto.file, "profile_photo", recipe, undefined, undefined, { onProgress: setUploadProgress });
      setCoreForm((prev) => ({
        ...prev,
        profilePhotoMediaId: mediaItem.id,
        profilePhotoUrl: mediaItem.file_url,
      }));
      closePhotoAdjustment();
      toast.success("Photo uploaded!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to upload photo";
      setPhotoError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-900">Core profile</h2>
        <p className="text-sm text-slate-600">
          Basic identity and contact details so we can support you safely.
        </p>
      </div>

      <div className="rounded-xl border-2 border-cyan-200 bg-cyan-50/60 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-slate-900">
              Add your profile photo <span className="text-rose-500">*</span>
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Required to continue. It helps coaches and other SwimBuddz members recognise you.
            </p>
          </div>
          {!coreForm.profilePhotoUrl ? (
            <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
              Required
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <label className="relative group w-fit cursor-pointer">
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
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={saving}
              onChange={(event) => {
                const input = event.currentTarget;
                const file = input.files?.[0];
                if (!file) return;
                input.value = "";
                closePhotoAdjustment();
                setPendingPhoto({ file, objectUrl: URL.createObjectURL(file) });
              }}
            />
            {coreForm.profilePhotoUrl && !saving ? (
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
                <Camera className="h-8 w-8 text-white" />
              </div>
            ) : null}
          </label>
          <div className="flex-1 space-y-2">
            <Button
              type="button"
              variant={coreForm.profilePhotoUrl ? "outline" : "primary"}
              size="sm"
              disabled={saving}
              onClick={() => photoInputRef.current?.click()}
              className="gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {coreForm.profilePhotoUrl ? "Change profile photo" : "Upload profile photo"}
            </Button>
            <p className="text-xs text-slate-500">JPG, PNG or GIF. You can crop it before saving.</p>
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

      {pendingPhoto ? (
        <ImageCropDialog
          isOpen
          imageUrl={pendingPhoto.objectUrl}
          purpose="profile_photo"
          isSaving={saving}
          uploadProgress={uploadProgress}
          error={photoError}
          onCancel={closePhotoAdjustment}
          onConfirm={saveAdjustedPhoto}
        />
      ) : null}

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
