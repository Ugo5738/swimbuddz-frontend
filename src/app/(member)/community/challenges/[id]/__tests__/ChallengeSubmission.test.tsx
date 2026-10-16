import { beforeEach, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Page from "../page";
import { SubmitForm } from "../SubmitForm";
import type { Challenge, ChallengeSubmission } from "@/lib/challenges";

const mocks = vi.hoisted(() => ({ get: vi.fn(), mine: vi.fn(), submit: vi.fn(), upload: vi.fn() }));
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "challenge" }), useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("@/hooks/useApi", () => ({ useApi: () => ({ data: { id: "member" }, loading: false }) }));
vi.mock("@/lib/challenges", async (original) => ({ ...await original<typeof import("@/lib/challenges")>(), getChallenge: mocks.get, listMySubmissions: mocks.mine, submitChallenge: mocks.submit }));
vi.mock("@/lib/media", () => ({ uploadMedia: mocks.upload, uploadAdjustedImage: vi.fn(), registerMediaUrl: vi.fn() }));

const challenge: Challenge = {
  id: "challenge", title: "Bottle Balance Back Sculling — 25m", challenge_type: "technique",
  badge_name: "Bottle Balancer", format: "competition", team_enabled: false,
  is_active: true, example_media: [], completion_count: 0, submission_count: 0,
  description: null, instructions: null, reward_badge_image_media_id: null,
  badge_image_url: null, reward_bubbles_amount: 5, reward_volunteer_hours: null,
  audience: "community", club_id: null, academy_cohort_id: null,
  winner_submission_id: null, is_public: true, show_winner_media_publicly: true,
  starts_at: null, ends_at: null, team_min_size: null, team_max_size: null,
  created_at: "2026-05-09T06:48:46Z", updated_at: "2026-05-09T06:48:46Z",
  series_slug: null, series_order: null, requires_challenge_id: null,
};
const incomplete = (id: string, status: string) => ({ id, status, is_team_submission: false }) as ChallengeSubmission;
const file = () => new File(["sample video"], "attempt.mov", { type: "video/quicktime" });
const chooseVideo = () => fireEvent.change(screen.getByLabelText("Add proof photo or video", { selector: "input" }), { target: { files: [file()] } });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn(() => "blob:proof"), revokeObjectURL: vi.fn() }));
  mocks.get.mockResolvedValue(challenge);
  mocks.mine.mockResolvedValue([]);
  mocks.submit.mockResolvedValue({});
  mocks.upload.mockResolvedValue({ id: "video-proof", file_url: "https://example.com/proof.mov" });
});

it("opens a challenge with incomplete saved attempts without crashing or permitting a duplicate", async () => {
  mocks.mine.mockResolvedValue([incomplete("new", "pending"), incomplete("old", "rejected")]);
  render(<Page />);
  expect(await screen.findByRole("heading", { name: challenge.title })).toBeInTheDocument();
  expect(screen.getAllByText("Submission date unavailable")).toHaveLength(2);
  expect(screen.getByRole("button", { name: /Attempt under review/ })).toBeDisabled();
});

it("sorts complete history newest first and offers retry after rejection", async () => {
  mocks.mine.mockResolvedValue([
    { ...incomplete("old", "rejected"), created_at: "2026-05-01T12:00:00Z", proof_media: [] },
    { ...incomplete("new", "rejected"), created_at: "2026-10-16T07:00:00Z", review_note: "Keep the bottle upright", proof_media: [] },
  ]);
  render(<Page />);
  fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
  expect(screen.getByRole("dialog", { name: /Submit attempt:/ })).toBeInTheDocument();
  expect(screen.getByText("Keep the bottle upright")).toBeInTheDocument();
});

it("waits for video upload, then preserves proof when a submission fails and is retried", async () => {
  let finishUpload!: (value: unknown) => void;
  mocks.upload.mockImplementation((_file, _purpose, _linked, _title, _description, options) => {
    options.onProgress(42);
    return new Promise((resolve) => { finishUpload = resolve; });
  });
  mocks.submit.mockRejectedValueOnce(new Error("Please try again"));
  const success = vi.fn();
  render(<SubmitForm challenge={challenge} onSuccess={success} />);
  chooseVideo();
  expect(await screen.findByRole("button", { name: "Uploading proof…" })).toBeDisabled();
  expect(screen.getByRole("progressbar", { name: "Upload progress" })).toHaveAttribute("value", "42");
  expect(mocks.submit).not.toHaveBeenCalled();
  await act(async () => finishUpload({ id: "video-proof", file_url: "https://example.com/proof.mov" }));
  fireEvent.click(screen.getByRole("button", { name: "Submit attempt" }));
  expect(await screen.findByText("Please try again")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Submit attempt" }));
  await waitFor(() => expect(success).toHaveBeenCalledWith("Attempt submitted! An admin will review it shortly."));
  expect(mocks.upload).toHaveBeenCalledTimes(1);
  expect(mocks.submit).toHaveBeenLastCalledWith({ challenge_id: "challenge", submission_note: null, proof_media: [{ media_id: "video-proof", order_idx: 0 }], team_member_ids: [] });
});

it("shows a failed video upload and permits selecting the same file again", async () => {
  mocks.upload.mockRejectedValueOnce(new Error("Upload interrupted"));
  render(<SubmitForm challenge={challenge} onSuccess={vi.fn()} />);
  chooseVideo();
  expect(await screen.findByText("Upload interrupted")).toBeInTheDocument();
  expect(mocks.submit).not.toHaveBeenCalled();
  chooseVideo();
  await waitFor(() => expect(screen.getByRole("button", { name: "Submit attempt" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Submit attempt" }));
  await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1));
  expect(mocks.upload).toHaveBeenCalledTimes(2);
});
