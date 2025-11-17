import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AdminLayout } from "@/components/layout/AdminLayout";

const mockIdentity = {
  name: "Coach Ada",
  role: "admin"
};

export default function AdminLayoutWrapper({ children }: { children: ReactNode }) {
  // TODO: Replace mock identity with apiGet("/api/v1/identity/me", { auth: true }) and check role.
  if (mockIdentity.role !== "admin") {
    redirect("/");
  }

  return <AdminLayout>{children}</AdminLayout>;
}
