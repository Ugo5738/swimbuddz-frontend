"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AcademyApi, EnrollmentStatus, PaymentStatus, EnrollmentWithStudent } from "@/lib/academy";

interface UpdateEnrollmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    enrollment: EnrollmentWithStudent;
    onSuccess: () => void;
}

export function UpdateEnrollmentModal({ isOpen, onClose, enrollment, onSuccess }: UpdateEnrollmentModalProps) {
    const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatus>(enrollment.status);
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(enrollment.payment_status);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await AcademyApi.updateEnrollment(enrollment.id, {
                status: enrollmentStatus,
                payment_status: paymentStatus,
            });
            toast.success("Enrollment updated successfully");
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to update enrollment", error);
            toast.error("Failed to update enrollment");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div
                className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="mb-4 text-xl font-bold text-slate-900">Update Enrollment</h2>

                <div className="mb-4 rounded-lg bg-slate-50 p-3">
                    <div className="text-sm font-medium text-slate-900">
                        {enrollment.member.first_name} {enrollment.member.last_name}
                    </div>
                    <div className="text-xs text-slate-500">{enrollment.member.email}</div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="enrollmentStatus" className="block text-sm font-medium text-slate-700 mb-1">
                            Enrollment Status
                        </label>
                        <select
                            id="enrollmentStatus"
                            value={enrollmentStatus}
                            onChange={(e) => setEnrollmentStatus(e.target.value as EnrollmentStatus)}
                            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        >
                            {Object.values(EnrollmentStatus).map((status) => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="paymentStatus" className="block text-sm font-medium text-slate-700 mb-1">
                            Payment Status
                        </label>
                        <select
                            id="paymentStatus"
                            value={paymentStatus}
                            onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        >
                            {Object.values(PaymentStatus).map((status) => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 rounded bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
