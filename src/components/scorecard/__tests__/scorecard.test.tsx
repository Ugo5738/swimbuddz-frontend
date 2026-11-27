import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  computeLivePacePer100m,
  computeLiveSwolf,
  formatBenchmarkSummary,
  formatDurationSeconds,
  formatPacePer100m,
  type MemberScorecard,
} from "@/lib/scorecard";
import { BenchmarkTrendChart } from "../BenchmarkTrendChart";
import { PerformanceBenchmarksSection } from "../PerformanceBenchmarksSection";
import { ScorecardOverviewHero } from "../ScorecardOverviewHero";
import { SkillsMatrixSection } from "../SkillsMatrixSection";

function makeSampleScorecard(overrides: Partial<MemberScorecard> = {}): MemberScorecard {
  return {
    member_id: "m-1",
    member_name: "Ada Obi",
    first_name: "Ada",
    profile_photo_url: null,
    member_since: "2026-01-10T00:00:00Z",
    active_programmes: ["Community", "Club"],
    has_club_access: true,
    has_full_performance_access: true,
    viewer_audience: "self",
    can_edit_self: true,
    can_verify: false,
    pod_name: "Dolphins",
    club_name: "Yaba Club",
    club_readiness: {
      is_club_ready: true,
      outcome: "club_ready",
      nonstop_distance_m: 100,
      deep_water_comfort: "comfortable",
      primary_technique_focus: "Bilateral breathing",
      first_club_milestone: "200m continuous freestyle",
      completed_at: "2026-03-01T10:00:00Z",
    },
    headline: {
      total_skills: 34,
      verified_skills_count: 8,
      confident_or_mastered_count: 10,
      pending_review_count: 1,
      safety_gates_cleared: 2,
      safety_gates_total: 4,
      verified_strokes_unlocked: ["Freestyle"],
      top_distance_m: 400,
      top_distance_stroke: "Freestyle",
      top_distance_verified: true,
      best_spl: 18,
      best_spl_pool_length_m: 25,
      best_swolf: 39.5,
      best_swolf_pool_length_m: 25,
      latest_stroke_rate_spm: 54.0,
      latest_stroke_rate_source: "strokelab_ai",
    },
    domains: [
      {
        code: "foundations",
        title: "Water Foundations & Safety",
        short_title: "Foundations",
        description: "Comfort, breathing, and water safety.",
        order_index: 1,
        layer: "foundations",
        default_expanded_for_beginner: true,
        total_skills: 1,
        started_count: 1,
        confident_or_mastered_count: 1,
        verified_count: 1,
        pending_review_count: 0,
        stroke_unlocked: false,
        skills: [
          {
            skill_code: "fnd_deep_water_tread",
            domain: "foundations",
            title: "30s Deep-Water Treading",
            description: "Calm vertical treading.",
            ti_focal_point: "Slow scissor kick and wide sculling palms.",
            order_index: 5,
            is_safety_gate: true,
            proficiency: "confident",
            verification_source: "coach_verified",
            verification_status: "verified",
            verified_proficiency: "confident",
            is_verified: true,
            is_safety_gate_cleared: true,
            auto_verified_via: "Club Readiness Assessment",
            verified_by_member_id: null,
            verified_by_name: null,
            verified_by_role: null,
            verified_at: "2026-03-01T10:00:00Z",
            member_notes: null,
            verifier_notes: null,
            updated_at: null,
          },
        ],
      },
    ],
    personal_bests: [
      {
        key: "spl:freestyle:25m",
        label: "Best Freestyle SPL (25m pool)",
        stroke: "freestyle",
        benchmark_type: "spl",
        value: 18,
        display_value: "18 SPL",
        unit: "strokes/length",
        pool_length_m: 25,
        pool_name: "Rowe Park",
        recorded_at: "2026-10-12T10:00:00Z",
        verification_source: "coach_verified",
        is_verified: true,
        benchmark_id: "b-1",
      },
    ],
    benchmarks: [],
    trends: [
      {
        metric_key: "spl",
        title: "Strokes Per Length (SPL)",
        unit: "strokes",
        higher_is_better: false,
        points: [
          {
            recorded_at: "2026-08-01T10:00:00Z",
            value: 22,
            display_value: "22 SPL (25m)",
            stroke: "freestyle",
            pool_length_m: 25,
            pool_name: "Rowe Park",
            verification_source: "self_logged",
            label: null,
          },
          {
            recorded_at: "2026-10-12T10:00:00Z",
            value: 18,
            display_value: "18 SPL (25m)",
            stroke: "freestyle",
            pool_length_m: 25,
            pool_name: "Rowe Park",
            verification_source: "coach_verified",
            label: "Q4 Benchmark Day",
          },
        ],
      },
    ],
    strokelab: {
      available: true,
      total_analyses: 2,
      latest_stroke_rate_spm: 54.0,
      latest_body_roll_degrees: 48.0,
      latest_breath_balance_left_ratio: 0.45,
      latest_focus_area: "balance",
      latest_summary_text: "Relax your neck and hold your lead arm longer.",
      latest_completed_at: "2026-10-15T10:00:00Z",
      recent_runs: [],
    },
    academy: {
      available: true,
      milestones_achieved: 5,
      milestones_in_progress: 1,
      certificates_earned: 1,
      cohorts_completed: 1,
      active_enrollments: 0,
      recent_milestones: [],
    },
    consistency: {
      available: true,
      volunteer_available: true,
      total_sessions_attended: 24,
      total_pool_hours: 36.0,
      longest_streak_weeks: 6,
      current_streak_weeks: 3,
      punctuality_rate: 0.92,
      volunteer_hours: 8.0,
      volunteer_tier: "tier_2",
      volunteer_recognition_tier: "silver",
      rides_shared: 5,
      events_attended: 4,
      latest_quarter_label: "Q4 2026",
    },
    settings: {
      pod_visibility_enabled: true,
      show_benchmarks_to_pod: false,
      directory_highlights_enabled: false,
      public_share_card_enabled: false,
      share_token: null,
      preferred_pool_length_m: 25,
    },
    source_availability: {
      academy: true,
      reporting: true,
      volunteer: true,
      strokelab: true,
    },
    ...overrides,
  };
}

describe("scorecard math and formatting helpers", () => {
  it("computes pace/100m and SWOLF accurately", () => {
    expect(computeLivePacePer100m(50, 55)).toBe(110);
    expect(computeLivePacePer100m(200, 240)).toBe(120);
    expect(computeLivePacePer100m(0, 50)).toBeNull();
    expect(computeLiveSwolf(21.5, 18)).toBe(39.5);
    expect(computeLiveSwolf(undefined, 18)).toBeNull();
  });

  it("formats durations, paces, and benchmark summaries clearly", () => {
    expect(formatDurationSeconds(42.3)).toBe("42.3s");
    expect(formatDurationSeconds(125.5)).toBe("2:05.5");
    expect(formatPacePer100m(110)).toBe("1:50.0 /100m");
    expect(
      formatBenchmarkSummary({
        benchmark_type: "spl",
        distance_m: null,
        duration_seconds: 21.5,
        pace_per_100m_seconds: null,
        stroke_count: 18,
        stroke_rate_spm: null,
        swolf_score: 39.5,
        pool_length_m: 25,
      }),
    ).toBe("18 SPL · SWOLF 39.5 · 25m pool");
  });
});

describe("Scorecard UI components", () => {
  it("renders athletic identity hero without a punitive overall grade", () => {
    const sc = makeSampleScorecard();
    render(<ScorecardOverviewHero scorecard={sc} />);
    expect(screen.getByText("Ada Obi")).toBeInTheDocument();
    expect(screen.getByText("Club Ready")).toBeInTheDocument();
    expect(screen.getByText("✓ Freestyle")).toBeInTheDocument();
    expect(screen.getByText("400m")).toBeInTheDocument();
    expect(screen.getByText("18 SPL")).toBeInTheDocument();
    expect(screen.getByText("From Stroke Lab AI")).toBeInTheDocument();
  });

  it("renders skills matrix with safety gate cleared and TI focus", () => {
    const sc = makeSampleScorecard();
    render(
      <SkillsMatrixSection
        memberId={sc.member_id}
        domains={sc.domains}
        canEditSelf={true}
        canVerify={false}
        hasClubAccess={true}
        onUpdated={vi.fn()}
      />,
    );
    expect(screen.getByText("30s Deep-Water Treading")).toBeInTheDocument();
    expect(screen.getByText("Safety Gate Cleared")).toBeInTheDocument();
    expect(screen.getByText(/Auto-verified via Club Readiness Assessment/)).toBeInTheDocument();
  });

  it("shows Club perk prompt for non-Club members while preserving Stroke Lab snapshot", () => {
    const sc = makeSampleScorecard({
      has_club_access: false,
      has_full_performance_access: false,
    });
    render(
      <PerformanceBenchmarksSection
        memberId={sc.member_id}
        hasFullPerformanceAccess={false}
        canEditSelf={true}
        canVerify={false}
        personalBests={sc.personal_bests}
        benchmarks={sc.benchmarks}
        trends={sc.trends}
        strokelab={sc.strokelab}
        onUpdated={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/Full Performance Benchmarks & Verified Benchmark Days are a Club Perk/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Relax your neck and hold your lead arm longer/)).toBeInTheDocument();
  });

  it("renders progression chart with improvement delta and verified badge", () => {
    const sc = makeSampleScorecard();
    render(<BenchmarkTrendChart series={sc.trends[0]} />);
    expect(screen.getByText("Strokes Per Length (SPL)")).toBeInTheDocument();
    expect(screen.getByText("-4.0 strokes")).toBeInTheDocument();
    expect(screen.getByText("18 SPL (25m)")).toBeInTheDocument();
    expect(screen.getByText("Q4 Benchmark Day")).toBeInTheDocument();
  });
});
