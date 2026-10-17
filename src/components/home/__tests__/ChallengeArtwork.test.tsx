import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ChallengesCarousel } from "../ChallengesCarousel";
import { SkillLaddersShowcase } from "@/components/club/SkillLaddersShowcase";
import PublicChallengesPage from "@/app/(public)/challenges/page";
import MemberChallengesPage from "@/app/(member)/community/challenges/page";
import type { Challenge, PublicChallenge } from "@/lib/challenges";

const mocks = vi.hoisted(() => ({
  publicList: vi.fn(), memberList: vi.fn(), series: vi.fn(), submissions: vi.fn(),
}));
vi.mock("@/lib/challenges", async (original) => ({
  ...await original<typeof import("@/lib/challenges")>(),
  listPublicChallenges: mocks.publicList,
  listChallenges: mocks.memberList,
  listChallengesBySeries: mocks.series,
  listMySubmissions: mocks.submissions,
}));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => <img src={src} alt={alt} className={className} />,
}));

const badge = "https://d3on2iqx8wzllm.cloudfront.net/badge-images/test.png";
const example = "https://d3on2iqx8wzllm.cloudfront.net/challenge-examples/test.jpg";
const challenge: PublicChallenge = {
  id: "50m-sprint", title: "50m Sprint Challenge", description: "Complete a 50-meter swim.",
  instructions: null, challenge_type: "time_trial", badge_name: "50m Swimmer",
  reward_badge_image_media_id: "uploaded-badge", badge_image_url: badge,
  reward_bubbles_amount: 5, reward_volunteer_hours: null, audience: "club",
  format: "participatory", starts_at: null, ends_at: null, team_enabled: false,
  team_min_size: null, team_max_size: null, completion_count: 0, example_media: [],
  winner: null, is_finished: false, series_slug: null, series_order: null,
  created_at: "2026-05-09T06:48:46Z",
};

function load(item: PublicChallenge, carousel = false) {
  const member: Challenge = {
    ...item, club_id: null, academy_cohort_id: null, is_active: true,
    is_public: true, show_winner_media_publicly: true, winner_submission_id: null,
    submission_count: 0, updated_at: item.created_at, requires_challenge_id: null,
  };
  mocks.publicList.mockResolvedValue(carousel ? [item, { ...item, id: "second", title: "100m Sprint Challenge" }] : [item]);
  mocks.memberList.mockResolvedValue([member]);
  mocks.series.mockResolvedValue({ endurance: [{ ...member, series_slug: "endurance", series_order: 1 }] });
  mocks.submissions.mockResolvedValue([]);
}

const surfaces = [
  ["homepage hero", ChallengesCarousel, false],
  ["homepage carousel", ChallengesCarousel, true],
  ["public listing", PublicChallengesPage, false],
  ["member listing", MemberChallengesPage, false],
  ["Club skill ladder", SkillLaddersShowcase, false],
] as const;

beforeEach(() => { vi.clearAllMocks(); });

it.each(surfaces)("shows the uploaded badge in the %s when no example media is set", async (_name, Surface, carousel) => {
  load(challenge, carousel);
  const { container } = render(<Surface />);
  await screen.findByText(challenge.title);
  const image = container.querySelector(`img[src="${badge}"]`);
  expect(image).toBeInTheDocument();
  expect(image).toHaveClass("object-contain");
  expect(image).not.toHaveClass("object-cover");
});

it.each(surfaces)("preserves the example image in the %s when both images exist", async (_name, Surface, carousel) => {
  load({ ...challenge, example_media: [{ media_id: "example", order_idx: 0, caption: null, thumbnail_url: example, file_url: example }] }, carousel);
  const { container } = render(<Surface />);
  await screen.findByText(challenge.title);
  expect(container.querySelector(`img[src="${example}"]`)).toHaveClass("object-cover");
  expect(container.querySelector(`img[src="${badge}"]`)).not.toBeInTheDocument();
});

it("keeps a configured example video playable instead of replacing it with the badge", async () => {
  load({ ...challenge, example_media: [{ media_id: "example-video", order_idx: 0, caption: null, thumbnail_url: null, file_url: "https://example.com/demo.mp4" }] });
  const { container } = render(<ChallengesCarousel />);
  await waitFor(() => expect(container.querySelector("video")).toHaveAttribute("src", "https://example.com/demo.mp4"));
  expect(container.querySelector(`img[src="${badge}"]`)).not.toBeInTheDocument();
});
