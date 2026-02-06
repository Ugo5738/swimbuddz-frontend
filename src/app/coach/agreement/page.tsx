"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingCard } from "@/components/ui/LoadingCard";
import {
    AgreementApi,
    type AgreementContent,
    type AgreementHistoryItem,
    type AgreementStatus,
    type SignatureType,
} from "@/lib/coaches";
import { formatDate } from "@/lib/format";
import {
    ArrowLeft,
    CheckCircle,
    Clock,
    FileText,
    History,
    PenLine,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function CoachAgreementPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Get returnTo param for redirect after signing
    const returnTo = searchParams.get("returnTo");

    // State
    const [loading, setLoading] = useState(true);
    const [signing, setSigning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [agreement, setAgreement] = useState<AgreementContent | null>(null);
    const [status, setStatus] = useState<AgreementStatus | null>(null);
    const [history, setHistory] = useState<AgreementHistoryItem[]>([]);

    // Signing form state
    const [showSigningForm, setShowSigningForm] = useState(false);
    const [signatureType, setSignatureType] = useState<SignatureType>("typed_name");
    const [typedName, setTypedName] = useState("");
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [handbookAcknowledged, setHandbookAcknowledged] = useState(false);

    // Canvas drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            setError(null);

            const [agreementData, statusData, historyData] = await Promise.all([
                AgreementApi.getCurrentAgreement(),
                AgreementApi.getAgreementStatus().catch(() => null),
                AgreementApi.getAgreementHistory().catch(() => []),
            ]);

            setAgreement(agreementData);
            setStatus(statusData);
            setHistory(historyData);

            // If already signed current version, don't show signing form
            if (statusData?.has_signed_current_version) {
                setShowSigningForm(false);
            }
        } catch (err) {
            console.error("Failed to load agreement", err);
            setError("Failed to load agreement. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    function handleScroll(e: React.UIEvent<HTMLDivElement>) {
        const target = e.target as HTMLDivElement;
        const isNearBottom =
            target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
        if (isNearBottom) {
            setHasScrolledToBottom(true);
        }
    }

    // Canvas drawing functions
    function initCanvas() {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Set canvas size
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2; // Higher res
        canvas.height = rect.height * 2;
        ctx.scale(2, 2);

        // Set drawing style
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
    }

    function startDrawing(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
        const canvas = canvasRef.current;
        if (!canvas) return;

        setIsDrawing(true);
        setHasDrawn(true);

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
        const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

        ctx.beginPath();
        ctx.moveTo(x, y);
    }

    function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
        if (!isDrawing) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
        const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

        ctx.lineTo(x, y);
        ctx.stroke();
    }

    function stopDrawing() {
        setIsDrawing(false);
    }

    function clearCanvas() {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasDrawn(false);
    }

    function getCanvasDataUrl(): string {
        const canvas = canvasRef.current;
        if (!canvas) return "";
        return canvas.toDataURL("image/png");
    }

    async function handleSign() {
        if (!agreement) return;

        // Validate
        if (signatureType === "typed_name" && !typedName.trim()) {
            setError("Please type your full name");
            return;
        }

        if (signatureType === "drawn" && !hasDrawn) {
            setError("Please draw your signature");
            return;
        }

        if (!agreedToTerms) {
            setError("Please confirm that you have read and agree to the terms");
            return;
        }

        if (!handbookAcknowledged) {
            setError("Please acknowledge that you have read the Coach Handbook");
            return;
        }

        if (signatureType === "checkbox" && !agreedToTerms) {
            setError("Please check the agreement checkbox");
            return;
        }

        setSigning(true);
        setError(null);

        try {
            let signatureData: string;
            if (signatureType === "typed_name") {
                signatureData = typedName.trim();
            } else if (signatureType === "drawn") {
                signatureData = getCanvasDataUrl();
            } else if (signatureType === "checkbox") {
                signatureData = "CHECKBOX_AGREE";
            } else {
                signatureData = typedName.trim(); // fallback
            }

            await AgreementApi.signAgreement({
                signature_type: signatureType,
                signature_data: signatureData,
                agreement_version: agreement.version,
                agreement_content_hash: agreement.content_hash,
                handbook_acknowledged: true,
                handbook_version: undefined, // Will be set by backend
            });

            setSuccess(true);

            // Reload status
            const newStatus = await AgreementApi.getAgreementStatus();
            setStatus(newStatus);
            setShowSigningForm(false);

            // Refresh history
            const newHistory = await AgreementApi.getAgreementHistory();
            setHistory(newHistory);

            // Redirect to returnTo if provided
            if (returnTo) {
                setTimeout(() => {
                    router.push(returnTo);
                }, 1500);
            }
        } catch (err) {
            console.error("Failed to sign agreement", err);
            setError("Failed to sign agreement. Please try again.");
        } finally {
            setSigning(false);
        }
    }

    if (loading) {
        return <LoadingCard text="Loading agreement..." />;
    }

    if (!agreement) {
        return (
            <Alert variant="error" title="Error">
                Could not load agreement. Please try again later.
            </Alert>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href={returnTo || "/coach/dashboard"}>
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        {returnTo === "/coach/onboarding" ? "Back to Setup" : "Dashboard"}
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Coach Agreement</h1>
                    <p className="text-slate-600">Version {agreement.version}</p>
                </div>
            </div>

            {/* Status Banner */}
            {status && (
                <Card className={`p-4 ${status.has_signed_current_version ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
                    <div className="flex items-center gap-3">
                        {status.has_signed_current_version ? (
                            <>
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <div>
                                    <p className="font-medium text-green-900">
                                        Agreement Signed
                                    </p>
                                    <p className="text-sm text-green-700">
                                        You signed version {status.signed_version} on{" "}
                                        {status.signed_at && formatDate(status.signed_at)}
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <Clock className="h-5 w-5 text-amber-600" />
                                <div>
                                    <p className="font-medium text-amber-900">
                                        Signature Required
                                    </p>
                                    <p className="text-sm text-amber-700">
                                        Please review and sign the agreement to continue coaching.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </Card>
            )}

            {success && (
                <Alert variant="success" title="Agreement Signed">
                    Thank you for signing the coach agreement.{" "}
                    {returnTo
                        ? "Redirecting you back..."
                        : "You can now continue coaching!"}
                </Alert>
            )}

            {error && (
                <Alert variant="error" title="Error">
                    {error}
                </Alert>
            )}

            {/* Agreement Content */}
            <Card className="overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-center gap-3">
                    <FileText className="h-5 w-5 text-slate-600" />
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">
                            {agreement.title}
                        </h2>
                        <p className="text-sm text-slate-600">
                            Effective from {formatDate(agreement.effective_date)}
                        </p>
                    </div>
                </div>

                <div
                    className="px-8 py-6 max-h-[36rem] overflow-y-auto"
                    onScroll={handleScroll}
                >
                    <article className="markdown-content max-w-none">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                // Add anchored headings for potential TOC linking
                                h1: ({ children, ...props }) => {
                                    const text = String(children);
                                    const id = text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
                                    return <h1 id={id} {...props}>{children}</h1>;
                                },
                                h2: ({ children, ...props }) => {
                                    const text = String(children);
                                    const id = text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
                                    return <h2 id={id} {...props}>{children}</h2>;
                                },
                                h3: ({ children, ...props }) => {
                                    const text = String(children);
                                    const id = text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
                                    return <h3 id={id} {...props}>{children}</h3>;
                                },
                                table: ({ children, ...props }) => (
                                    <div className="my-6 overflow-x-auto">
                                        <table {...props}>{children}</table>
                                    </div>
                                ),
                            }}
                        >
                            {agreement.content}
                        </ReactMarkdown>
                    </article>
                </div>

                {!status?.has_signed_current_version && !showSigningForm && (
                    <div className="border-t border-slate-200 bg-slate-50 p-6">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-600">
                                {hasScrolledToBottom
                                    ? "Ready to sign the agreement?"
                                    : "Please scroll to read the entire agreement"}
                            </p>
                            <Button
                                onClick={() => {
                                    setShowSigningForm(true);
                                    initCanvas();
                                }}
                                disabled={!hasScrolledToBottom}
                            >
                                <PenLine className="h-4 w-4 mr-2" />
                                Sign Agreement
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Signing Form */}
            {showSigningForm && !status?.has_signed_current_version && (
                <Card className="p-6 space-y-6">
                    <h2 className="text-lg font-semibold text-slate-900">
                        Sign the Agreement
                    </h2>

                    {/* Signature Type Selection */}
                    <div className="space-y-3">
                        <p className="text-sm font-medium text-slate-700">
                            Choose signature type
                        </p>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setSignatureType("typed_name")}
                                className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                                    signatureType === "typed_name"
                                        ? "border-cyan-500 bg-cyan-50"
                                        : "border-slate-200 hover:border-slate-300"
                                }`}
                            >
                                <p className="font-medium text-slate-900">Type Name</p>
                                <p className="text-sm text-slate-600">
                                    Type your full legal name
                                </p>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSignatureType("drawn");
                                    setTimeout(initCanvas, 100);
                                }}
                                className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                                    signatureType === "drawn"
                                        ? "border-cyan-500 bg-cyan-50"
                                        : "border-slate-200 hover:border-slate-300"
                                }`}
                            >
                                <p className="font-medium text-slate-900">Draw Signature</p>
                                <p className="text-sm text-slate-600">
                                    Draw your signature
                                </p>
                            </button>
                            <button
                                type="button"
                                onClick={() => setSignatureType("checkbox")}
                                className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                                    signatureType === "checkbox"
                                        ? "border-cyan-500 bg-cyan-50"
                                        : "border-slate-200 hover:border-slate-300"
                                }`}
                            >
                                <p className="font-medium text-slate-900">Checkbox</p>
                                <p className="text-sm text-slate-600">
                                    Agree with a checkbox
                                </p>
                            </button>
                        </div>
                    </div>

                    {/* Typed Name Input */}
                    {signatureType === "typed_name" && (
                        <div>
                            <Input
                                label="Full Legal Name"
                                placeholder="Enter your full name as it appears on your ID"
                                value={typedName}
                                onChange={(e) => setTypedName(e.target.value)}
                            />
                            {typedName && (
                                <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                    <p className="text-xs text-slate-500 mb-2">Preview</p>
                                    <p
                                        className="text-2xl text-slate-900"
                                        style={{ fontFamily: "cursive" }}
                                    >
                                        {typedName}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Drawn Signature Canvas */}
                    {signatureType === "drawn" && (
                        <div className="space-y-3">
                            <p className="text-sm text-slate-600">
                                Draw your signature in the box below
                            </p>
                            <div className="relative">
                                <canvas
                                    ref={canvasRef}
                                    className="w-full h-32 border-2 border-slate-200 rounded-lg bg-white cursor-crosshair touch-none"
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={stopDrawing}
                                    onMouseLeave={stopDrawing}
                                    onTouchStart={startDrawing}
                                    onTouchMove={draw}
                                    onTouchEnd={stopDrawing}
                                />
                                <button
                                    type="button"
                                    onClick={clearCanvas}
                                    className="absolute top-2 right-2 text-xs text-slate-500 hover:text-slate-700"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Handbook Acknowledgment */}
                    <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm font-medium text-amber-800">
                            Coach Handbook Acknowledgment
                        </p>
                        <p className="text-sm text-amber-700">
                            Before signing, you must read and acknowledge the{" "}
                            <Link
                                href="/coach/handbook"
                                className="font-medium underline hover:text-amber-900"
                                target="_blank"
                            >
                                Coach Handbook
                            </Link>
                            .
                        </p>
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={handbookAcknowledged}
                                onChange={(e) => setHandbookAcknowledged(e.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                            />
                            <span className="text-sm text-amber-800">
                                I have read and understood the Coach Handbook.
                            </span>
                        </label>
                    </div>

                    {/* Agreement Checkbox */}
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={agreedToTerms}
                            onChange={(e) => setAgreedToTerms(e.target.checked)}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        <span className="text-sm text-slate-700">
                            I have read and agree to the terms of this Coach Agreement. I
                            understand that this is a legally binding agreement.
                        </span>
                    </label>

                    {/* Submit Button */}
                    <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-200">
                        <Button
                            variant="outline"
                            onClick={() => setShowSigningForm(false)}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleSign} disabled={signing}>
                            {signing ? "Signing..." : "Sign Agreement"}
                        </Button>
                    </div>
                </Card>
            )}

            {/* Agreement History */}
            {history.length > 0 && (
                <Card className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <History className="h-5 w-5 text-slate-600" />
                        <h2 className="text-lg font-semibold text-slate-900">
                            Signing History
                        </h2>
                    </div>
                    <div className="space-y-3">
                        {history.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                            >
                                <div>
                                    <p className="font-medium text-slate-900">
                                        Version {item.agreement_version}
                                    </p>
                                    <p className="text-sm text-slate-600">
                                        Signed on {formatDate(item.signed_at)} (
                                        {item.signature_type === "typed_name"
                                            ? "typed"
                                            : "drawn"}
                                        )
                                    </p>
                                </div>
                                <Badge variant={item.is_active ? "success" : "default"}>
                                    {item.is_active ? "Active" : "Superseded"}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}
