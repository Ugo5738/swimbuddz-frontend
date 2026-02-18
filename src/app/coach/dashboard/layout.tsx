import { type ReactNode } from "react";

// This layout is now simple since the parent /coach/layout.tsx handles auth and CoachLayout
export default function CoachDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
