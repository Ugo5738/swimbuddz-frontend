"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type LedgerRole = "viewer" | "accountant" | "admin" | "owner";

type LedgerUserOut = {
  id: string;
  auth_id: string | null;
  email: string | null;
  role: LedgerRole;
  created_at: string;
  deactivated_at: string | null;
  // Set on add / resend responses: "invited" | "exists" | "error".
  invite_status?: string | null;
};

const ROLES: LedgerRole[] = ["viewer", "accountant", "admin", "owner"];

/** Human-readable result of provisioning a finance member's login. */
function inviteMessage(status: string | null | undefined, email: string): string {
  switch (status) {
    case "invited":
      return `Added. An invite email was sent to ${email} — they click it to set a password, then log in and open /admin/finance.`;
    case "exists":
      return `Added. ${email} already has a SwimBuddz login, so they can sign in now and open /admin/finance.`;
    default:
      return `Added, but the invite email could not be sent. Use "Resend invite", or invite ${email} from the Supabase dashboard.`;
  }
}

export default function FinanceTeamPage() {
  const [users, setUsers] = useState<LedgerUserOut[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<LedgerRole>("viewer");
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<LedgerUserOut[]>("/api/v1/admin/finance/users", {
        auth: true,
      });
      setUsers(data);
    } catch (e) {
      console.error("Failed to load finance team:", e);
      setError("Could not load the finance team. (Admin/owner role required.)");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addUser = async () => {
    if (!newEmail.trim()) return;
    const email = newEmail.trim();
    setAdding(true);
    setError(null);
    setMessage(null);
    try {
      const created = await apiPost<LedgerUserOut>(
        "/api/v1/admin/finance/users",
        { email, role: newRole },
        { auth: true },
      );
      setNewEmail("");
      setNewRole("viewer");
      await load();
      setMessage(inviteMessage(created.invite_status, email));
    } catch (e) {
      console.error("Failed to add finance user:", e);
      setError(
        "Could not add — they may already exist, or you can't grant a role above your own.",
      );
    } finally {
      setAdding(false);
    }
  };

  const resendInvite = async (id: string, email: string | null) => {
    setError(null);
    setMessage(null);
    try {
      const res = await apiPost<LedgerUserOut>(
        `/api/v1/admin/finance/users/${id}/invite`,
        {},
        { auth: true },
      );
      setMessage(inviteMessage(res.invite_status, email ?? "them"));
    } catch (e) {
      console.error("Failed to resend invite:", e);
      setError("Could not resend the invite email.");
    }
  };

  const changeRole = async (id: string, role: LedgerRole) => {
    setError(null);
    try {
      await apiPatch(`/api/v1/admin/finance/users/${id}`, { role }, { auth: true });
      await load();
    } catch (e) {
      console.error("Failed to change role:", e);
      setError("Could not change role (can't act on a role above your own).");
    }
  };

  const deactivate = async (id: string) => {
    if (!window.confirm("Deactivate this finance user?")) return;
    setError(null);
    try {
      await apiDelete(`/api/v1/admin/finance/users/${id}`, { auth: true });
      await load();
    } catch (e) {
      console.error("Failed to deactivate:", e);
      setError("Could not deactivate this user.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Finance — Team</h1>
        <p className="mt-1 text-sm text-slate-500">
          Who can see and act on the books. owner ⊇ admin ⊇ accountant ⊇ viewer.
          Adding someone emails them an invite to set a password — no Supabase
          step needed. They sign in and open /admin/finance; they see nothing
          else in admin.
        </p>
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="text-slate-600">Email</span>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="teammate@swimbuddz.com"
              className="mt-1 w-64 rounded-lg border border-slate-200 px-3 py-1.5"
            />
          </label>
          <label className="text-sm">
            <span className="text-slate-600">Role</span>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as LedgerRole)}
              className="mt-1 block rounded-lg border border-slate-200 px-3 py-1.5"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <Button onClick={addUser} disabled={adding || !newEmail.trim()} size="sm">
            <UserPlus className="mr-1 h-4 w-4" /> {adding ? "Adding…" : "Add member"}
          </Button>
        </div>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-700">{message}</p>}

      <Card>
        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : users && users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="py-2 pr-4 font-medium">Member</th>
                  <th className="py-2 pr-4 font-medium">Role</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Added</th>
                  <th className="py-2 pr-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const active = !u.deactivated_at;
                  return (
                    <tr key={u.id} className="border-b border-slate-50">
                      <td className="py-2 pr-4 text-slate-800">
                        {u.email || u.auth_id || "—"}
                      </td>
                      <td className="py-2 pr-4">
                        {active ? (
                          <select
                            value={u.role}
                            onChange={(e) =>
                              changeRole(u.id, e.target.value as LedgerRole)
                            }
                            className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-400">{u.role}</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {active ? (
                          <Badge variant="success">active</Badge>
                        ) : (
                          <Badge variant="outline">deactivated</Badge>
                        )}
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap text-slate-500">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="space-x-3 py-2 pr-4 whitespace-nowrap">
                        {active && u.email && (
                          <button
                            type="button"
                            onClick={() => resendInvite(u.id, u.email)}
                            className="text-sm text-cyan-700 hover:underline"
                          >
                            Resend invite
                          </button>
                        )}
                        {active && (
                          <button
                            type="button"
                            onClick={() => deactivate(u.id)}
                            className="text-sm text-red-600 hover:underline"
                          >
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No finance team members yet.</p>
        )}
      </Card>
    </div>
  );
}
