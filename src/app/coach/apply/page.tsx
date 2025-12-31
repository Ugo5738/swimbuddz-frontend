"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { getCurrentAccessToken, supabase } from "@/lib/auth";
import {
    ageGroupOptions,
    certificationOptions,
    CoachApplicationData,
    CoachesApi,
    coachSpecialtyOptions,
    levelsTaughtOptions,
} from "@/lib/coaches";
import { API_BASE_URL } from "@/lib/config";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type ApplicationStep = "check" | "auth" | "form" | "status";
type DocumentMethod = "link" | "upload";

const experienceRanges = [
    { value: "0", label: "Less than 1 year" },
    { value: "1", label: "1-2 years" },
    { value: "3", label: "3-4 years" },
    { value: "5", label: "5-9 years" },
    { value: "10", label: "10+ years" },
];

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
                const { data: { user: authUser } } = await supabase.auth.getUser();

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

    const toggleArrayValue = (field: keyof CoachApplicationData, value: string) => {
        const current = (formData[field] as string[]) || [];
        const updated = current.includes(value)
            ? current.filter((v) => v !== value)
            : [...current, value];
        setFormData({ ...formData, [field]: updated });
    };

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file size (10MB max)
            if (file.size > 10 * 1024 * 1024) {
                setError("File size must be less than 10MB");
                return;
            }
            // Validate file type
            const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
            if (!validTypes.includes(file.type)) {
                setError("Only PDF, JPG, and PNG files are accepted");
                return;
            }
            setUploadedFile(file);
            setFormData({ ...formData, coaching_document_file_name: file.name });
            setError(null);
        }
    }, [formData]);

    const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) {
            // Same validation
            if (file.size > 10 * 1024 * 1024) {
                setError("File size must be less than 10MB");
                return;
            }
            const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
            if (!validTypes.includes(file.type)) {
                setError("Only PDF, JPG, and PNG files are accepted");
                return;
            }
            setUploadedFile(file);
            setFormData({ ...formData, coaching_document_file_name: file.name });
            setError(null);
        }
    }, [formData]);

    const uploadCoachDocument = async (file: File): Promise<string> => {
        const token = await getCurrentAccessToken();
        if (!token) throw new Error("Not authenticated");

        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`${API_BASE_URL}/api/v1/media/uploads/coach-documents`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });

        if (!response.ok) {
            let message = `Failed to upload document (status ${response.status})`;
            try {
                const errorBody = await response.json();
                if (errorBody?.detail) {
                    message = Array.isArray(errorBody.detail)
                        ? errorBody.detail.map((d: any) => d.msg || d).join(", ")
                        : errorBody.detail;
                }
            } catch {
                // ignore JSON parse errors
            }
            throw new Error(message);
        }

        const mediaItem = await response.json();
        if (!mediaItem?.file_url) {
            throw new Error("Upload succeeded but no file URL was returned");
        }
        return mediaItem.file_url as string;
    };

    const handleSubmit = async () => {
        setError(null);
        setSubmitting(true);

        try {
            // Validate required fields
            if (!formData.short_bio || formData.short_bio.length < 20) {
                throw new Error("Please write a bio (at least 20 characters)");
            }
            if (formData.coaching_specialties.length === 0) {
                throw new Error("Please select at least one specialty");
            }

            let finalFormData = { ...formData };

            // Handle file upload if using upload method
            if (documentMethod === "upload" && uploadedFile) {
                setUploading(true);
                try {
                    const fileUrl = await uploadCoachDocument(uploadedFile);
                    finalFormData.coaching_document_link = fileUrl;
                } catch (err) {
                    throw new Error(err instanceof Error ? err.message : "Failed to upload document");
                } finally {
                    setUploading(false);
                }
            }

            await CoachesApi.apply(finalFormData);
            setExistingStatus("pending_review");
            setStep("status");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to submit application");
        } finally {
            setSubmitting(false);
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
                            Coaches are vetted professionals who work with our Club and Academy swimmers.
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
                            Coaches do not pay membership fees. This application takes ~5 minutes.
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
                                    <h1 className="text-2xl font-bold text-slate-900">Application Submitted!</h1>
                                    <p className="text-slate-600">
                                        Thanks for applying to coach with SwimBuddz.<br />
                                        Our team will review your application within 2–5 days.
                                    </p>
                                </div>

                                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                                    <h3 className="font-medium text-slate-900">What happens next?</h3>
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
                                    <h1 className="text-2xl font-bold text-slate-900">More Information Needed</h1>
                                    <p className="text-slate-600">
                                        We need additional details before we can process your application.
                                    </p>
                                </div>
                                <Alert variant="info" title="What we need">
                                    {rejectionReason || "Please check your email for details."}
                                </Alert>
                            </>
                        )}

                        {existingStatus === "approved" && (
                            <>
                                <div className="text-center space-y-2">
                                    <div className="text-4xl">🎉</div>
                                    <h1 className="text-2xl font-bold text-slate-900">Welcome to SwimBuddz Coaching!</h1>
                                    <p className="text-slate-600">
                                        Your application has been approved. Complete your onboarding to start coaching.
                                    </p>
                                </div>
                                <Button className="w-full" onClick={() => router.push("/coach/onboarding")}>
                                    Complete Onboarding →
                                </Button>
                            </>
                        )}

                        {existingStatus === "active" && (
                            <>
                                <div className="text-center space-y-2">
                                    <div className="text-4xl">🏊‍♂️</div>
                                    <h1 className="text-2xl font-bold text-slate-900">You're an Active Coach</h1>
                                    <p className="text-slate-600">
                                        Head to your dashboard to manage sessions and swimmers.
                                    </p>
                                </div>
                                <Button className="w-full" onClick={() => router.push("/coach/dashboard")}>
                                    Go to Dashboard →
                                </Button>
                            </>
                        )}

                        {existingStatus === "rejected" && (
                            <>
                                <div className="text-center space-y-2">
                                    <div className="text-4xl">😔</div>
                                    <h1 className="text-2xl font-bold text-slate-900">Application Not Approved</h1>
                                    <p className="text-slate-600">
                                        Unfortunately, we couldn't approve your application at this time.
                                    </p>
                                </div>
                                <Alert variant="error" title="Reason">
                                    {rejectionReason || "Please check your email for details."}
                                </Alert>
                                <div className="text-center pt-4 border-t border-slate-100">
                                    <Link href="/" className="text-sm text-cyan-600 hover:underline">
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
                        Coaches are vetted professionals who work with our Club and Academy swimmers.<br />
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
                            <span className="text-emerald-500">✓</span> Approval required before coaching
                        </span>
                    </div>
                </div>

                {error && <Alert variant="error">{error}</Alert>}

                <Card className="p-6 space-y-8">
                    {/* About Section */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-slate-900">About You</h2>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Public Coach Name
                            </label>
                            <p className="text-xs text-slate-500 mb-2">
                                This is how swimmers will see you (e.g., "Coach Tobi")
                            </p>
                            <input
                                type="text"
                                placeholder="e.g., Coach Tobi"
                                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-cyan-500 focus:outline-none"
                                value={formData.display_name || ""}
                                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Short Bio <span className="text-red-500">*</span>
                            </label>
                            <p className="text-xs text-slate-500 mb-2">
                                Tell swimmers about yourself and your coaching philosophy
                            </p>
                            <textarea
                                placeholder="Share your background, coaching style, and what drives you..."
                                rows={4}
                                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-cyan-500 focus:outline-none"
                                value={formData.short_bio}
                                onChange={(e) => setFormData({ ...formData, short_bio: e.target.value })}
                            />
                            <p className="text-xs text-slate-500 mt-1">{formData.short_bio.length}/500 characters (minimum 20)</p>
                        </div>
                    </div>

                    {/* Experience Section */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-slate-900">Experience</h2>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Years of Coaching Experience <span className="text-red-500">*</span>
                            </label>
                            <select
                                className="w-full sm:w-48 rounded-lg border border-slate-300 px-4 py-2 focus:border-cyan-500 focus:outline-none bg-white"
                                value={formData.coaching_years}
                                onChange={(e) => setFormData({ ...formData, coaching_years: parseInt(e.target.value) || 0 })}
                            >
                                {experienceRanges.map((range) => (
                                    <option key={range.value} value={range.value}>
                                        {range.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Coaching Specialties <span className="text-red-500">*</span>
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {coachSpecialtyOptions.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => toggleArrayValue("coaching_specialties", opt.value)}
                                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${formData.coaching_specialties.includes(opt.value)
                                            ? "bg-cyan-100 border-cyan-500 text-cyan-700"
                                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Levels You Teach
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {levelsTaughtOptions.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => toggleArrayValue("levels_taught", opt.value)}
                                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${(formData.levels_taught || []).includes(opt.value)
                                            ? "bg-cyan-100 border-cyan-500 text-cyan-700"
                                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Age Groups You Teach
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {ageGroupOptions.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => toggleArrayValue("age_groups_taught", opt.value)}
                                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${(formData.age_groups_taught || []).includes(opt.value)
                                            ? "bg-cyan-100 border-cyan-500 text-cyan-700"
                                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Certifications Section */}
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Certifications</h2>
                            <p className="text-xs text-slate-500 mt-1">
                                Select all that apply. You'll be asked to provide proof in the documents section below.
                            </p>
                        </div>

                        <div>
                            <div className="flex flex-wrap gap-2">
                                {certificationOptions.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => toggleArrayValue("certifications", opt.value)}
                                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${formData.certifications.includes(opt.value)
                                            ? "bg-emerald-100 border-emerald-500 text-emerald-700"
                                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Other Certifications
                            </label>
                            <input
                                type="text"
                                placeholder="List any other certifications not shown above..."
                                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-cyan-500 focus:outline-none"
                                value={formData.other_certifications_note || ""}
                                onChange={(e) => setFormData({ ...formData, other_certifications_note: e.target.value })}
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="cpr"
                                checked={formData.has_cpr_training || false}
                                onChange={(e) => setFormData({ ...formData, has_cpr_training: e.target.checked })}
                                className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                            />
                            <label htmlFor="cpr" className="text-sm text-slate-700">
                                I have current CPR/First Aid training
                            </label>
                        </div>
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
                                Upload a certificate, CV, or proof of coaching experience for admin review.
                            </p>
                        </div>

                        {/* Toggle between Upload and Link */}
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit">
                            <button
                                type="button"
                                onClick={() => setDocumentMethod("link")}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${documentMethod === "link"
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-600 hover:text-slate-900"
                                    }`}
                            >
                                Provide Link
                            </button>
                            <button
                                type="button"
                                onClick={() => setDocumentMethod("upload")}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${documentMethod === "upload"
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-600 hover:text-slate-900"
                                    }`}
                            >
                                Upload File
                            </button>
                        </div>

                        {documentMethod === "link" ? (
                            <div key="link" className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Document Link (Google Drive, Dropbox, etc.)
                                    </label>
                                    <input
                                        type="url"
                                        placeholder="https://drive.google.com/..."
                                        className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-cyan-500 focus:outline-none"
                                        value={formData.coaching_document_link || ""}
                                        onChange={(e) => setFormData({ ...formData, coaching_document_link: e.target.value })}
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        Make sure access is set to "Anyone with the link can view"
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Document Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., ASCA Level 2 Certificate"
                                        className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-cyan-500 focus:outline-none"
                                        value={formData.coaching_document_file_name || ""}
                                        onChange={(e) => setFormData({ ...formData, coaching_document_file_name: e.target.value })}
                                    />
                                </div>
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
                                            <p className="font-medium text-slate-900">{uploadedFile.name}</p>
                                            <p className="text-xs text-slate-500">
                                                {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setUploadedFile(null);
                                                    setFormData({ ...formData, coaching_document_file_name: "" });
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
                                                Drag & drop your file here, or <span className="text-cyan-600">browse</span>
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
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Document Name
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g., ASCA Level 2 Certificate"
                                            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-cyan-500 focus:outline-none"
                                            value={formData.coaching_document_file_name || ""}
                                            onChange={(e) => setFormData({ ...formData, coaching_document_file_name: e.target.value })}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        <p className="text-xs text-slate-500 flex items-center gap-1">
                            <span>🔒</span>
                            These documents are only visible to SwimBuddz admins and will not be shown publicly.
                        </p>
                    </div>

                    {/* Portfolio Link */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-slate-900">Portfolio (optional)</h2>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Website or Social Profile
                            </label>
                            <input
                                type="url"
                                placeholder="https://..."
                                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-cyan-500 focus:outline-none"
                                value={formData.coaching_portfolio_link || ""}
                                onChange={(e) => setFormData({ ...formData, coaching_portfolio_link: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="pt-6 border-t border-slate-100 space-y-4">
                        <Button
                            className="w-full"
                            onClick={handleSubmit}
                            disabled={submitting || uploading}
                        >
                            {uploading || submitting ? "Submitting your application..." : "Submit Application"}
                        </Button>
                        <p className="text-xs text-slate-500 text-center">
                            By submitting, you agree to our coach guidelines and code of conduct.
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    );
}
