import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { expect, it, vi, beforeEach } from "vitest";
import { apiGet } from "@/lib/api";
import AttendanceHistoryPage from "../page";

vi.mock("@/lib/api", () => ({
  apiGet: vi.fn(),
}));

const mockSave = vi.fn();
const mockText = vi.fn();
const mockLine = vi.fn();
const mockSetFontSize = vi.fn();
const mockSetTextColor = vi.fn();
const mockSetDrawColor = vi.fn();
const mockSetFont = vi.fn();
const mockAddPage = vi.fn();
const mockSetPage = vi.fn();
const mockSplitTextToSize = vi.fn((text: string) => [text]);

vi.mock("jspdf", () => {
  return {
    jsPDF: vi.fn().mockImplementation(() => ({
      setFontSize: mockSetFontSize,
      setTextColor: mockSetTextColor,
      setDrawColor: mockSetDrawColor,
      setFont: mockSetFont,
      text: mockText,
      line: mockLine,
      addPage: mockAddPage,
      setPage: mockSetPage,
      splitTextToSize: mockSplitTextToSize,
      internal: { pages: [null, {}] },
      save: mockSave,
    })),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

it("renders attendance records and triggers PDF export on click", async () => {
  vi.mocked(apiGet).mockImplementation(async (path: string) => {
    if (path === "/api/v1/attendance/me") {
      return [
        {
          id: "rec-1",
          session_id: "sess-1",
          status: "present",
          session: {
            id: "sess-1",
            title: "Week 1 - Freestyle Basics",
            session_type: "academy",
            start_time: "2026-10-31T13:00:00Z",
          },
        },
      ];
    }
    if (path === "/api/v1/members/me") {
      return {
        first_name: "Joshua",
        last_name: "Swimmer",
        email: "joshua@example.com",
      };
    }
    return [];
  });

  render(<AttendanceHistoryPage />);

  await waitFor(() => {
    expect(screen.getAllByText("Week 1 - Freestyle Basics")[0]).toBeInTheDocument();
  });

  expect(screen.getByText(/You've attended 1 session/)).toBeInTheDocument();
  const exportBtn = screen.getByRole("button", { name: /Export PDF/i });
  expect(exportBtn).toBeInTheDocument();

  fireEvent.click(exportBtn);

  await waitFor(() => {
    expect(mockSave).toHaveBeenCalledWith(
      expect.stringMatching(/^SwimBuddz_Attendance_Record_.*\.pdf$/)
    );
  });
});
