import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TemplatesDrawer } from "../TemplatesDrawer";
import type { Template } from "@/app/(admin)/admin/sessions/types";

vi.mock("@/hooks/useApi", () => ({
  useApi: () => ({
    data: [{ id: "cohort-september", name: "September beginners", status: "active" }],
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/components/admin/PoolPicker", () => ({
  PoolPicker: () => <div data-testid="pool-picker" />,
  getPoolOption: vi.fn(async () => ({ id: "pool-rowe", name: "Rowe Park Pool" })),
}));

vi.mock("@/components/admin/ClubSessionScopeFields", () => ({
  ClubSessionScopeFields: ({
    scope,
    onClubChange,
    onScopeChange,
    onPodChange,
  }: {
    scope: "general" | "pod";
    onClubChange: (id: string, club: unknown) => void;
    onScopeChange: (scope: "general" | "pod") => void;
    onPodChange: (id: string, pod: unknown) => void;
  }) => (
    <div>
      <button
        type="button"
        onClick={() =>
          onClubChange("club-lagos", {
            id: "club-lagos",
            name: "Lagos Mainland Club",
            default_pool_id: "pool-rowe",
          })
        }
      >
        Select Lagos Club
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={scope === "general"}
        onClick={() => onScopeChange("general")}
      >
        General Club
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={scope === "pod"}
        onClick={() => onScopeChange("pod")}
      >
        Pod-specific
      </button>
      {scope === "pod" && (
        <button
          type="button"
          onClick={() =>
            onPodChange("pod-orca", {
              id: "pod-orca",
              club_id: "club-lagos",
              name: "Orca",
              default_pool_id: "pool-rowe",
            })
          }
        >
          Select Orca pod
        </button>
      )}
    </div>
  ),
}));

vi.mock("@/components/admin/SessionTemplateVolunteerSlotsSection", () => ({
  SessionTemplateVolunteerSlotsSection: () => null,
}));

vi.mock("@/components/admin/VolunteerNeedsDraftSection", () => ({
  VolunteerNeedsDraftSection: ({ onChange }: { onChange: (needs: unknown[]) => void }) => (
    <button
      type="button"
      onClick={() =>
        onChange([
          {
            role_id: "role-safety",
            role_title: "Safety",
            slots_needed: 2,
            opportunity_type: "approval_required",
            min_tier: "tier_2",
            title_override: "Safety lead",
          },
        ])
      }
    >
      Add test template need
    </button>
  ),
}));

vi.mock("@/lib/pods", () => ({
  adminGetPod: vi.fn(),
}));

function renderCreateDrawer(onCreateTemplate = vi.fn()) {
  render(
    <TemplatesDrawer
      templates={[]}
      rideAreas={[]}
      templateForm="create"
      editingTemplate={null}
      onClose={vi.fn()}
      onCreateTemplate={onCreateTemplate}
      onUpdateTemplate={vi.fn()}
      onArchiveTemplate={vi.fn()}
      onDeleteTemplate={vi.fn()}
      onGenerate={vi.fn()}
      onOpenForm={vi.fn()}
    />
  );
  fireEvent.change(screen.getByLabelText(/Title/), {
    target: { value: "Saturday Club Swim" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Select Lagos Club" }));
  return onCreateTemplate;
}

describe("TemplatesDrawer Club scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(["included", "paid_extra"] as const)(
    "saves Academy cohort and %s billing without Club context",
    async (mode) => {
      const onCreate = renderCreateDrawer();
      fireEvent.change(screen.getByLabelText("Session Type"), {
        target: { value: "cohort_class" },
      });
      fireEvent.change(screen.getByRole("combobox", { name: /^Cohort/ }), {
        target: { value: "cohort-september" },
      });
      fireEvent.change(screen.getByLabelText("Class payment"), { target: { value: mode } });
      fireEvent.change(screen.getByLabelText("Booking price per student (₦)"), {
        target: { value: "15000" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Create Template" }));
      await waitFor(() => expect(onCreate).toHaveBeenCalledOnce());
      expect(onCreate.mock.calls[0][0]).toMatchObject({
        session_type: "cohort_class",
        cohort_id: "cohort-september",
        cohort_fee_mode: mode,
        pool_fee: 15000,
        club_id: null,
        pod_id: null,
      });
    }
  );

  it("requires a cohort for an Academy template", async () => {
    const onCreate = renderCreateDrawer();
    fireEvent.change(screen.getByLabelText("Session Type"), { target: { value: "cohort_class" } });
    expect(screen.getByRole("combobox", { name: /^Cohort/ })).toBeRequired();
    fireEvent.click(screen.getByRole("button", { name: "Create Template" }));
    await waitFor(() => expect(onCreate).not.toHaveBeenCalled());
  });

  it("clears cohort and paid-extra billing when switching to Community", async () => {
    const onCreate = renderCreateDrawer();
    fireEvent.change(screen.getByLabelText("Session Type"), { target: { value: "cohort_class" } });
    fireEvent.change(screen.getByRole("combobox", { name: /^Cohort/ }), {
      target: { value: "cohort-september" },
    });
    fireEvent.change(screen.getByLabelText("Class payment"), { target: { value: "paid_extra" } });
    fireEvent.change(screen.getByLabelText("Session Type"), { target: { value: "community" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Template" }));
    await waitFor(() => expect(onCreate).toHaveBeenCalledOnce());
    expect(onCreate.mock.calls[0][0]).toMatchObject({
      cohort_id: null,
      cohort_fee_mode: "included",
    });
  });

  it("saves inherited pricing inputs with the selected Club, not a fixed template fee", async () => {
    const onCreate = renderCreateDrawer();
    await screen.findByLabelText(/^Expected attendees/);
    expect(screen.getByLabelText("Pool Fee (N)")).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Club access mode"), {
      target: { value: "active_club" },
    });
    fireEvent.change(screen.getByLabelText(/^Expected attendees/), { target: { value: "15" } });
    fireEvent.change(screen.getByLabelText("Margin basis"), { target: { value: "percentage" } });
    fireEvent.change(screen.getByLabelText(/^Margin value/), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Template" }));
    await waitFor(() => expect(onCreate).toHaveBeenCalledOnce());
    expect(onCreate.mock.calls[0][0]).toMatchObject({
      club_id: "club-lagos",
      club_access_mode: "active_club",
      pricing_settings: {
        pricing_expected_attendees: 15,
        margin_type: "percentage",
        margin_value: 25,
      },
    });
  });

  it("creates a general Club template with no pod", async () => {
    const onCreate = renderCreateDrawer();

    expect(screen.getByRole("radio", { name: "General Club" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    expect(screen.queryByLabelText(/^Pod/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create Template" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onCreate.mock.calls[0][0]).toMatchObject({
      session_type: "club",
      club_id: "club-lagos",
      pod_id: null,
    });
  });

  it("submits a selected pod for a pod-specific Club template", async () => {
    const onCreate = renderCreateDrawer();

    fireEvent.click(screen.getByRole("radio", { name: "Pod-specific" }));
    fireEvent.click(screen.getByRole("button", { name: "Select Orca pod" }));
    fireEvent.click(screen.getByRole("button", { name: "Create Template" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onCreate.mock.calls[0][0]).toMatchObject({
      session_type: "club",
      club_id: "club-lagos",
      pod_id: "pod-orca",
    });
  });

  it("submits volunteer needs with a new template", async () => {
    const onCreate = renderCreateDrawer();
    fireEvent.click(screen.getByRole("button", { name: "Add test template need" }));
    fireEvent.click(screen.getByRole("button", { name: "Create Template" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onCreate.mock.calls[0][1]).toEqual([
      expect.objectContaining({ role_id: "role-safety", slots_needed: 2 }),
    ]);
  });
});

describe("Template generation routes and pricing labels", () => {
  const saved: Template = {
    id: "template",
    title: "Saturday template",
    session_type: "club",
    club_access_mode: "plan_included",
    club_id: "club-lagos",
    day_of_week: 5,
    start_time: "09:00",
    duration_minutes: 90,
    location: "sunfit_pool",
    pool_fee: 8765,
    capacity: 20,
    auto_generate: false,
    is_active: true,
  };
  function show(template: Template, archive = vi.fn(), remove = vi.fn(), openForm = vi.fn()) {
    const generate = vi.fn();
    render(
      <TemplatesDrawer
        templates={[template]}
        rideAreas={[]}
        templateForm={null}
        editingTemplate={null}
        onClose={vi.fn()}
        onCreateTemplate={vi.fn()}
        onUpdateTemplate={vi.fn()}
        onArchiveTemplate={archive}
        onDeleteTemplate={remove}
        onGenerate={generate}
        onOpenForm={openForm}
      />
    );
    return generate;
  }
  it("routes an old Academy template to cohort configuration instead of a failing Generate request", () => {
    const openForm = vi.fn();
    const template = { ...saved, session_type: "cohort_class", club_id: null };
    const generate = show(template, vi.fn(), vi.fn(), openForm);
    fireEvent.click(screen.getByRole("button", { name: "Choose cohort before generating" }));
    expect(openForm).toHaveBeenCalledWith("edit", template);
    expect(generate).not.toHaveBeenCalled();
  });
  it.each(["included", "paid_extra"] as const)(
    "allows a configured %s Academy template to generate",
    (mode) => {
      const template = {
        ...saved,
        session_type: "cohort_class",
        club_id: null,
        cohort_id: "cohort-september",
        cohort_fee_mode: mode,
      };
      const generate = show(template);
      fireEvent.click(screen.getByRole("button", { name: "Generate" }));
      expect(generate).toHaveBeenCalledWith(template);
    }
  );
  it.each(["plan_included", undefined] as const)(
    "routes included templates (%s) to the quarter workflow",
    (mode) => {
      const generate = show({ ...saved, club_access_mode: mode });
      expect(screen.getByRole("link", { name: "Generate Club quarter" })).toHaveAttribute(
        "href",
        "/admin/club-plans"
      );
      expect(screen.queryByRole("button", { name: "Generate" })).not.toBeInTheDocument();
      expect(screen.getByText(/Inherited pricing/)).toBeInTheDocument();
      expect(screen.queryByText(/8765/)).not.toBeInTheDocument();
      expect(generate).not.toHaveBeenCalled();
    }
  );
  it("offers archive without deleting active templates", () => {
    const archive = vi.fn();
    const remove = vi.fn();
    show(saved, archive, remove);
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(archive).toHaveBeenCalledWith(saved.id, true);
    expect(remove).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Delete permanently" })).not.toBeInTheDocument();
  });
  it("hides archived templates by default and offers restore or guarded permanent deletion", () => {
    const archive = vi.fn();
    const remove = vi.fn();
    show({ ...saved, is_active: false }, archive, remove);
    expect(screen.queryByText(saved.title)).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Show archived templates"));
    expect(screen.getByText("Archived")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Generate Club quarter" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Generate" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    expect(archive).toHaveBeenCalledWith(saved.id, false);
    fireEvent.click(screen.getByRole("button", { name: "Delete permanently" }));
    expect(remove).toHaveBeenCalledWith(saved.id);
  });
  it.each(["active_club", "paid_addon"] as const)("retains generic generation for %s", (mode) => {
    const template = { ...saved, club_access_mode: mode };
    const generate = show(template);
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    expect(generate).toHaveBeenCalledWith(template);
    expect(screen.getByText(/Inherited pricing/)).toBeInTheDocument();
    expect(screen.queryByText(/8765/)).not.toBeInTheDocument();
  });
  it("keeps the stored fee and Generate action for non-Club templates", () => {
    const template = { ...saved, session_type: "community", club_id: null };
    const generate = show(template);
    expect(screen.getByText(/N8765/)).toBeInTheDocument();
    expect(screen.queryByText(/Inherited pricing/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    expect(generate).toHaveBeenCalledWith(template);
  });
});
