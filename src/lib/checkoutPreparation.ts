import { apiGet, apiPost } from "@/lib/api";
import { canPayAcademyEnrollment } from "@/lib/academy/paymentEligibility";
import type { UpgradeState } from "@/lib/upgradeContext";

const statusOf = (error: unknown): number | undefined =>
  error instanceof Error && "status" in error && typeof error.status === "number" ? error.status : undefined;

/** Only read/preparation operations may retry here; payment submission is separate. */
export async function prepareCheckout<T>(stage: string, operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await operation(); }
    catch (error) {
      const status = statusOf(error);
      const transient = error instanceof TypeError || (status !== undefined && status >= 500);
      console.warn("Checkout preparation failed", { stage, attempt, status, transient });
      if (!transient || attempt >= 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt));
    }
  }
}

type Enrollment = { id: string; cohort_id?: string; status: string; payment_status?: string };

export async function prepareAcademyEnrollment(cohortId: string, lateJoin?: UpgradeState["lateJoinPreferences"]) {
  let enrollment: Enrollment;
  try {
    enrollment = await prepareCheckout("academy-enrollment", () => apiPost<Enrollment>(
      "/api/v1/academy/enrollments/me", {
        cohort_id: cohortId, ...(lateJoin ? { preferences: { late_join: lateJoin } } : {}),
      }, { auth: true }
    ));
  } catch (error) {
    if (!(statusOf(error) === 409) &&
        !(error instanceof Error && error.message.toLowerCase().includes("already"))) throw error;
    const existing = await prepareCheckout("academy-existing-enrollment", () => apiGet<Enrollment[]>(
      "/api/v1/academy/my-enrollments", { auth: true }
    ));
    const match = existing.find((item) => item.cohort_id === cohortId &&
      (canPayAcademyEnrollment(item.status) || item.status === "waitlist"));
    if (!match) throw error;
    enrollment = match;
  }
  const payable = enrollment.payment_status !== "paid" && canPayAcademyEnrollment(enrollment.status);
  return { enrollment, path: payable
    ? `/checkout?purpose=academy_cohort&cohort_id=${encodeURIComponent(cohortId)}&enrollment_id=${encodeURIComponent(enrollment.id)}`
    : `/account/academy/enrollments/${enrollment.id}` };
}
