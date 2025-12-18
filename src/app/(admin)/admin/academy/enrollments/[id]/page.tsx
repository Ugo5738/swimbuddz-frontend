"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { Select } from "@/components/ui/Select";
import { AcademyApi, Cohort, Enrollment, EnrollmentStatus } from "@/lib/academy";
import { apiGet } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function EnrollmentDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
    const [member, setMember] = useState<any | null>(null);
    const [cohorts, setCohorts] = useState<Cohort[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [status, setStatus] = useState<EnrollmentStatus>(EnrollmentStatus.PENDING_APPROVAL);
    const [cohortId, setCohortId] = useState<string>("");

    useEffect(() => {
        loadData();
    }, [params.id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const found = await AcademyApi.getEnrollment(params.id);

            if (found) {
                setEnrollment(found);
                setStatus(found.status);
                setCohortId(found.cohort_id || "");

                // Fetch Member
                try {
                    const m = await apiGet<any>(`/api/v1/members/${found.member_id}`, { auth: true });
                    setMember(m);
                } catch (e) { console.error("Member fetch failed", e); }

                // Fetch Cohorts for this program
                const programId = found.program_id || found.program?.id;
                if (programId) {
                    const c = await AcademyApi.listCohorts(programId);
                    setCohorts(c);
                }
            } else {
                setError("Enrollment not found");
            }

        } catch (e) {
            setError("Failed to load data");
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setUpdating(true);
        setError(null);
        try {
            await AcademyApi.updateEnrollment(params.id, {
                status,
                cohort_id: cohortId || undefined, // Send undefined if empty? Or null? Backend says nullable.
            });
            router.push("/admin/academy/enrollments");
        } catch (e) {
            setError("Failed to update enrollment");
        } finally {
            setUpdating(false);
        }
    };

    if (loading) return <LoadingCard text="Loading details..." />;
    if (error || !enrollment) return <Alert variant="error" title="Error">{error || "Not found"}</Alert>;

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900">Manage Enrollment</h1>
                <Button variant="secondary" onClick={() => router.back()}>Back</Button>
            </div>

            <Card className="p-6 space-y-6">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Member Details</h2>
                    <div className="mt-2 text-sm text-slate-600">
                        <p><strong>Name:</strong> {member?.first_name} {member?.last_name}</p>
                        <p><strong>Email:</strong> {member?.email}</p>
                        <p><strong>Phone:</strong> {member?.phone}</p>
                    </div>
                </div>

                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Program Request</h2>
                    <p className="mt-2 text-sm text-slate-600">
                        <strong>Program:</strong> {enrollment.program?.name} ({enrollment.program?.level})
                    </p>
                    <div className="mt-2 bg-slate-50 p-3 rounded text-sm">
                        <p className="font-medium">Preferences:</p>
                        <pre className="mt-1 whitespace-pre-wrap text-xs text-slate-500">
                            {JSON.stringify(enrollment.preferences, null, 2)}
                        </pre>
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                    <Select
                        label="Status"
                        name="status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value as EnrollmentStatus)}
                    >
                        <option value={EnrollmentStatus.PENDING_APPROVAL}>Pending Approval</option>
                        <option value={EnrollmentStatus.ENROLLED}>Enrolled (Active)</option>
                        <option value={EnrollmentStatus.WAITLIST}>Waitlist</option>
                        <option value={EnrollmentStatus.DROPPED}>Dropped</option>
                        <option value={EnrollmentStatus.GRADUATED}>Graduated</option>
                    </Select>

                    <Select
                        label="Assign Cohort"
                        name="cohort"
                        value={cohortId}
                        onChange={(e) => setCohortId(e.target.value)}
                        hint="Assign the student to a specific cohort"
                    >
                        <option value="">No Cohort Assigned</option>
                        {cohorts.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.name} ({new Date(c.start_date).toLocaleDateString()} - Capacity: {c.capacity})
                            </option>
                        ))}
                    </Select>
                </div>

                <div className="flex justify-end pt-4">
                    <Button onClick={handleSave} disabled={updating}>
                        {updating ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
