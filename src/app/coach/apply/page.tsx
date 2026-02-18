"use client";

import { OptionPillGroup } from "@/components/forms/OptionPillGroup";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { Textarea } from "@/components/ui/Textarea";
import { supabase } from "@/lib/auth";
import {
  ageGroupOptions,
  certificationOptions,
  CoachApplicationData,
  CoachesApi,
  coachSpecialtyOptions,
  levelsTaughtOptions,
} from "@/lib/coaches";
import { uploadMedia } from "@/lib/media";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type ApplicationStep = "check" | "auth" | "form" | "status";
type DocumentMethod = "link" | "upload";

export default function CoachApplyPage() {
  const router = useRouter();

  const [step, setStep] = useState<ApplicationStep>("check");
  const [existingStatus, setExistingStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentMethod, setDocumentMethod] = useState<DocumentMethod>("link");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState<CoachApplicationData>({
    short_bio: "",
    coaching_years: 0,
    coaching_specialties: [],
    certifications: [],
    display_name: "",
    coaching_document_link: "",
    coaching_document_file_name: "",
    coaching_portfolio_link: "",
    other_certifications_note: "",
    levels_taught: [],
    age_groups_taught: [],
  });

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
          setStep("auth");
          setLoading(false);
          return;
        }

        try {
          const status = await CoachesApi.getApplicationStatus();
          if (status.status !== "none") {
            setExistingStatus(status.status);
            setRejectionReason(status.rejection_reason || null);
            setStep("status");
          } else {
            setStep("form");
          }
        } catch {
          setStep("form");
        }
      } catch {
        setStep("auth");
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, []);

  const toggleArrayValue = (
    field: keyof CoachApplicationData,
    value: string,
  ) => {
    const current = (formData[field] as string[]) || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setFormData({ ...formData, [field]: updated });
  };

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          setError("File size must be less than 10MB");
          return;
        }
        const validTypes = [
          "application/pdf",
          "image/jpeg",
          "image/png",
          "image/jpg",
        ];
        if (!validTypes.includes(file.type)) {
          setError("Only PDF, JPG, and PNG files are accepted");
          return;
        }
        setUploadedFile(file);
        setFormData({ ...formData, coaching_document_file_name: file.name });
        setError(null);
      }
    },
    [formData],
  );

  const handleFileDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          setError("File size must be less than 10MB");
          return;
        }
        const validTypes = [
          "application/pdf",
          "image/jpeg",
          "image/png",
          "image/jpg",
        ];
        if (!validTypes.includes(file.type)) {
          setError("Only PDF, JPG, and PNG files are accepted");
          return;
        }
        setUploadedFile(file);
        setFormData({ ...formData, coaching_document_file_name: file.name });
        setError(null);
      }
    },
    [formData],
  );

  const uploadCoachDocument = async (file: File): Promise<string> => {
    try {
      const mediaItem = await uploadMedia(
        file,
        "coach_document",
        undefined,
        file.name,
        "Coach application document",
      );

      if (!mediaItem?.file_url) {
        throw new Error("Upload succeeded but no file URL was returned");
      }

      return mediaItem.file_url as string;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to upload document";
      throw new Error(message);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);

    try {
      if (!formData.short_bio || formData.short_bio.length < 20) {
        throw new Error("Please write a bio (at least 20 characters)");
      }
      if ((formData.coaching_specialties || []).length === 0) {
        throw new Error("Please select at least one specialty");
      }

      let finalFormData = { ...formData };

      if (documentMethod === "upload" && uploadedFile) {
        setUploading(true);
        try {
          const fileUrl = await uploadCoachDocument(uploadedFile);
          finalFormData.coaching_document_link = fileUrl;
        } catch (err) {
          throw new Error(
            err instanceof Error ? err.message : "Failed to upload document",
          );
        } finally {
          setUploading(false);
        }
      }

      await CoachesApi.apply(finalFormData);
      setExistingStatus("pending_review");
      setStep("status");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit application",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateApplication = async () => {
    setLoading(true);
    try {
      const profile = await CoachesApi.getMe();
      setFormData({
        short_bio: profile.short_bio || "",
        coaching_years: profile.coaching_years || 0,
        coaching_specialties: profile.coaching_specialties || [],
        certifications: profile.certifications || [],
        display_name: profile.display_name || "",
        coaching_document_link: profile.coaching_document_link || "",
        coaching_document_file_name: profile.coaching_document_file_name || "",
        other_certifications_note: profile.other_certifications_note || "",
        levels_taught: profile.levels_taught || [],
        age_groups_taught: profile.age_groups_taught || [],
        coaching_portfolio_link: profile.coaching_portfolio_link || "",
        has_cpr_training: profile.has_cpr_training || false,
      });
      setStep("form");
    } catch (error) {
      console.error("Failed to load profile", error);
      setError("Failed to load your existing application. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingCard text="Checking your status..." />;
  }

  // Auth required
  if (step === "auth") {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-lg space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Apply to Coach with SwimBuddz
            </h1>
            <p className="mt-2 text-slate-600">
              Coaches are vetted professionals who work with our Club and
              Academy swimmers.
            </p>
          </div>

          <Card className="p-6 space-y-6">
            <p className="text-center text-slate-600 text-sm">
              To apply, you'll need to create an account or sign in first.
            </p>
            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={() => router.push("/login?redirect=/coach/apply")}
              >
                Sign In
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => router.push("/register?coach=true")}
              >
                Create Account
              </Button>
            </div>
            <p className="text-xs text-slate-500 text-center pt-4 border-t border-slate-100">
              Coaches do not pay membership fees. This application takes ~5
              minutes.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  // Status display
  if (step === "status") {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-lg space-y-8">
          <Card className="p-8 space-y-6">
            {existingStatus === "pending_review" && (
              <>
                <div className="text-center space-y-3">
                  <div className="text-5xl">🎉</div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    Application Submitted!
                  </h1>
                  <p className="text-slate-600">
                    Thanks for applying to coach with SwimBuddz.
                    <br />
                    Our team will review your application within 2–5 days.
                  </p>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                  <h3 className="font-medium text-slate-900">
                    What happens next?
                  </h3>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li className="flex gap-2">
                      <span className="text-cyan-500">•</span>
                      You'll receive an email confirmation shortly
                    </li>
                    <li className="flex gap-2">
                      <span className="text-cyan-500">•</span>
                      We may request additional information if needed
                    </li>
                    <li className="flex gap-2">
                      <span className="text-cyan-500">•</span>
                      If approved, your coach profile will be activated
                    </li>
                    <li className="flex gap-2">
                      <span className="text-cyan-500">•</span>
                      You'll complete a quick onboarding before coaching
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col gap-3">
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => router.push("/")}
                  >
                    Return to Homepage
                  </Button>
                </div>
              </>
            )}

            {existingStatus === "more_info_needed" && (
              <>
                <div className="text-center space-y-2">
                  <div className="text-4xl">📋</div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    More Information Needed
                  </h1>
                  <p className="text-slate-600">
                    We need additional details before we can process your
                    application.
                  </p>
                </div>
                <Alert variant="info" title="What we need">
                  {rejectionReason || "Please check your email for details."}
                </Alert>
                <Button className="w-full" onClick={handleUpdateApplication}>
                  Update Application →
                </Button>
              </>
            )}

            {existingStatus === "approved" && (
              <>
                <div className="text-center space-y-2">
                  <div className="text-4xl">🎉</div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    Welcome to SwimBuddz Coaching!
                  </h1>
                  <p className="text-slate-600">
                    Your application has been approved. Complete your onboarding
                    to start coaching.
                  </p>
                </div>
                <Button
                  className="w-full"
                  onClick={() => router.push("/coach/onboarding")}
                >
                  Complete Onboarding →
                </Button>
              </>
            )}

            {existingStatus === "active" && (
              <>
                <div className="text-center space-y-2">
                  <div className="text-4xl">🏊‍♂️</div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    You're an Active Coach
                  </h1>
                  <p className="text-slate-600">
                    Head to your dashboard to manage sessions and swimmers.
                  </p>
                </div>
                <Button
                  className="w-full"
                  onClick={() => router.push("/coach/dashboard")}
                >
                  Go to Dashboard →
                </Button>
              </>
            )}

            {existingStatus === "rejected" && (
              <>
                <div className="text-center space-y-2">
                  <div className="text-4xl">😔</div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    Application Not Approved
                  </h1>
                  <p className="text-slate-600">
                    Unfortunately, we couldn't approve your application at this
                    time.
                  </p>
                </div>
                <Alert variant="error" title="Reason">
                  {rejectionReason || "Please check your email for details."}
                </Alert>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleUpdateApplication}
                >
                  Apply Again
                </Button>
                <div className="text-center pt-4 border-t border-slate-100">
                  <Link
                    href="/"
                    className="text-sm text-cyan-600 hover:underline"
                  >
                    Return to homepage
                  </Link>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // Application form
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header with framing */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Apply to Coach with SwimBuddz
          </h1>
          <p className="text-slate-600">
            Coaches are vetted professionals who work with our Club and Academy
            swimmers.
            <br />
            This application takes ~5 minutes and does not require payment.
          </p>

          {/* Info strip */}
          <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-500">✓</span> Open to non-members
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-500">✓</span> No payment required
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-500">✓</span> Approval required
              before coaching
            </span>
          </div>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <Card className="p-6 space-y-8">
          {/* About Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">About You</h2>

            <Input
              label="Public Coach Name"
              hint="This is how swimmers will see you (e.g., 'Coach Tobi')"
              placeholder="e.g., Coach Tobi"
              value={formData.display_name || ""}
              onChange={(e) =>
                setFormData({ ...formData, display_name: e.target.value })
              }
            />

            <div>
              <Textarea
                label="Short Bio"
                required
                hint="Tell swimmers about yourself and your coaching philosophy"
                placeholder="Share your background, coaching style, and what drives you..."
                rows={4}
                value={formData.short_bio}
                onChange={(e) =>
                  setFormData({ ...formData, short_bio: e.target.value })
                }
              />
              <p className="text-xs text-slate-500 mt-1">
                {formData.short_bio.length}/500 characters (minimum 20)
              </p>
            </div>
          </div>

          {/* Experience Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Experience</h2>

            <Input
              label="Years of Coaching Experience"
              type="number"
              required
              min={0}
              max={50}
              value={formData.coaching_years}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  coaching_years: parseInt(e.target.value) || 0,
                })
              }
              className="w-full sm:w-48"
            />

            <OptionPillGroup
              label="Coaching Specialties"
              required
              options={coachSpecialtyOptions}
              selected={formData.coaching_specialties || []}
              onToggle={(value) =>
                toggleArrayValue("coaching_specialties", value)
              }
            />

            <OptionPillGroup
              label="Levels You Teach"
              options={levelsTaughtOptions}
              selected={formData.levels_taught || []}
              onToggle={(value) => toggleArrayValue("levels_taught", value)}
            />

            <OptionPillGroup
              label="Age Groups You Teach"
              options={ageGroupOptions}
              selected={formData.age_groups_taught || []}
              onToggle={(value) => toggleArrayValue("age_groups_taught", value)}
            />
          </div>

          {/* Certifications Section */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Certifications
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Select all that apply. You'll be asked to provide proof in the
                documents section below.
              </p>
            </div>

            <OptionPillGroup
              label="Certifications"
              options={certificationOptions}
              selected={formData.certifications || []}
              onToggle={(value) => toggleArrayValue("certifications", value)}
            />

            <Input
              label="Other Certifications"
              placeholder="List any other certifications not shown above..."
              value={formData.other_certifications_note || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  other_certifications_note: e.target.value,
                })
              }
            />

            <Checkbox
              label="I have current CPR/First Aid training"
              checked={formData.has_cpr_training || false}
              onChange={(e) =>
                setFormData({ ...formData, has_cpr_training: e.target.checked })
              }
            />
          </div>

          {/* Documents Section - Upload OR Link */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Supporting Documents
                <span className="ml-2 text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  Optional, but recommended
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Upload a certificate, CV, or proof of coaching experience for
                admin review.
              </p>
            </div>

            {/* Toggle between Upload and Link */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit">
              <button
                type="button"
                onClick={() => setDocumentMethod("link")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  documentMethod === "link"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Provide Link
              </button>
              <button
                type="button"
                onClick={() => setDocumentMethod("upload")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  documentMethod === "upload"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Upload File
              </button>
            </div>

            {documentMethod === "link" ? (
              <div key="link" className="space-y-3">
                <Input
                  label="Document Link (Google Drive, Dropbox, etc.)"
                  type="url"
                  placeholder="https://drive.google.com/..."
                  hint="Make sure access is set to 'Anyone with the link can view'"
                  value={formData.coaching_document_link || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      coaching_document_link: e.target.value,
                    })
                  }
                />

                <Input
                  label="Document Name"
                  placeholder="e.g., ASCA Level 2 Certificate"
                  value={formData.coaching_document_file_name || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      coaching_document_file_name: e.target.value,
                    })
                  }
                />
              </div>
            ) : (
              <div key="upload" className="space-y-3">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-cyan-500 transition-colors cursor-pointer"
                  onClick={() => document.getElementById("file-input")?.click()}
                >
                  {uploadedFile ? (
                    <div className="space-y-2">
                      <div className="text-3xl">📄</div>
                      <p className="font-medium text-slate-900">
                        {uploadedFile.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedFile(null);
                          setFormData({
                            ...formData,
                            coaching_document_file_name: "",
                          });
                        }}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-3xl text-slate-400">📁</div>
                      <p className="text-slate-600">
                        Drag & drop your file here, or{" "}
                        <span className="text-cyan-600">browse</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        Accepted formats: PDF, JPG, PNG • Max size: 10MB
                      </p>
                    </div>
                  )}
                  <input
                    id="file-input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {uploadedFile && (
                  <Input
                    label="Document Name"
                    placeholder="e.g., ASCA Level 2 Certificate"
                    value={formData.coaching_document_file_name || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        coaching_document_file_name: e.target.value,
                      })
                    }
                  />
                )}
              </div>
            )}

            <p className="text-xs text-slate-500 flex items-center gap-1">
              <span>🔒</span>
              These documents are only visible to SwimBuddz admins and will not
              be shown publicly.
            </p>
          </div>

          {/* Portfolio Link */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Portfolio (optional)
            </h2>

            <Input
              label="Website or Social Profile"
              type="url"
              placeholder="https://..."
              value={formData.coaching_portfolio_link || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  coaching_portfolio_link: e.target.value,
                })
              }
            />
          </div>

          {/* Submit */}
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={submitting || uploading}
            >
              {uploading || submitting
                ? "Submitting your application..."
                : "Submit Application"}
            </Button>
            <p className="text-xs text-slate-500 text-center">
              By submitting, you agree to our coach guidelines and code of
              conduct.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
