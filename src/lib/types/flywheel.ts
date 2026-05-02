/**
 * Flywheel metric types — re-exports from the generated OpenAPI types.
 *
 * Source of truth: `swimbuddz-backend/services/reporting_service/schemas/flywheel.py`
 * → `swimbuddz-backend/openapi.json` → `src/lib/api-types.ts` (generated).
 *
 * Endpoint paths (via gateway, all prefixed with `/api/v1`):
 *   GET  /admin/reports/flywheel/overview
 *   GET  /admin/reports/flywheel/cohorts?status=open,active&sort=fill_rate_asc
 *   GET  /admin/reports/flywheel/funnel?funnel_stage=...&cohort_period=...&limit=20
 *   GET  /admin/reports/flywheel/wallet
 *   POST /admin/reports/flywheel/refresh
 */

import type { components } from "@/lib/api-types";

/** Funnel stage discriminator — backend `FunnelStage` enum. */
export type FunnelStage = components["schemas"]["FunnelStage"];

/** Per-cohort fill state snapshot. */
export type CohortFillSnapshot = components["schemas"]["CohortFillSnapshotResponse"];

/** Cross-service funnel conversion snapshot. */
export type FunnelConversionSnapshot =
  components["schemas"]["FunnelConversionSnapshotResponse"];

/** Wallet cross-service ecosystem snapshot. */
export type WalletEcosystemSnapshot =
  components["schemas"]["WalletEcosystemSnapshotResponse"];

/** Combined overview of all flywheel metrics — single dashboard call. */
export type FlywheelOverview = components["schemas"]["FlywheelOverviewResponse"];

/** Response for manual refresh trigger. */
export type RefreshFlywheelResponse = components["schemas"]["RefreshFlywheelResponse"];
