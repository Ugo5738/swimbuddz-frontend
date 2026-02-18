"use client";

import { apiGet } from "@/lib/api";
import { Search, User, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface Coach {
  id: string;
  member_id: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name?: string;
  status: string;
  coaching_years: number;
  coaching_specialties: string[];
}

interface CoachPickerProps {
  value: string | null;
  onChange: (memberId: string | null, coach?: Coach) => void;
  label?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
}

export function CoachPicker({
  value,
  onChange,
  label = "Assign Coach",
  hint,
  error,
  disabled = false,
}: CoachPickerProps) {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadCoaches();
  }, []);

  const loadCoaches = async () => {
    try {
      const data = await apiGet<Coach[]>(
        "/api/v1/admin/coaches/?status=approved,active",
        { auth: true },
      );
      setCoaches(data);
    } catch (e) {
      console.error("Failed to load coaches", e);
    } finally {
      setLoading(false);
    }
  };

  const selectedCoach = useMemo(() => {
    return coaches.find((c) => c.member_id === value);
  }, [coaches, value]);

  const filteredCoaches = useMemo(() => {
    if (!searchQuery.trim()) return coaches;
    const query = searchQuery.toLowerCase();
    return coaches.filter(
      (c) =>
        c.first_name.toLowerCase().includes(query) ||
        c.last_name.toLowerCase().includes(query) ||
        (c.display_name && c.display_name.toLowerCase().includes(query)) ||
        c.email.toLowerCase().includes(query) ||
        c.coaching_specialties.some((s) => s.toLowerCase().includes(query)),
    );
  }, [coaches, searchQuery]);

  const handleSelect = (coach: Coach) => {
    if (coach.status !== "active") return;
    onChange(coach.member_id, coach);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = () => {
    onChange(null);
  };

  const getCoachDisplayName = (coach: Coach) => {
    return coach.display_name || `${coach.first_name} ${coach.last_name}`;
  };

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}

      <div className="relative">
        {/* Selected Coach or Dropdown Trigger */}
        {selectedCoach ? (
          <div className="flex items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                <User className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {getCoachDisplayName(selectedCoach)}
                </p>
                <p className="text-xs text-slate-500">{selectedCoach.email}</p>
              </div>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left hover:border-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
          >
            <span className="text-sm text-slate-500">
              {loading ? "Loading coaches..." : "Select a coach..."}
            </span>
            <Search className="h-4 w-4 text-slate-400" />
          </button>
        )}

        {/* Dropdown */}
        {isOpen && !disabled && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
            {/* Search Input */}
            <div className="border-b border-slate-100 p-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, or specialty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-md border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Coach List */}
            <div className="max-h-64 overflow-y-auto">
              {filteredCoaches.length === 0 ? (
                <div className="px-4 py-3 text-center text-sm text-slate-500">
                  {searchQuery
                    ? "No coaches found matching your search"
                    : "No approved coaches available"}
                </div>
              ) : (
                filteredCoaches.map((coach) => {
                  const isSelectable = coach.status === "active";
                  return (
                    <button
                      key={coach.id}
                      type="button"
                      onClick={() => handleSelect(coach)}
                      disabled={!isSelectable}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left ${
                        isSelectable
                          ? "hover:bg-slate-50"
                          : "cursor-not-allowed opacity-60"
                      }`}
                    >
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
                        <User className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {getCoachDisplayName(coach)}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {coach.email}
                        </p>
                        {coach.coaching_specialties.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {coach.coaching_specialties
                              .slice(0, 3)
                              .map((specialty, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                                >
                                  {specialty}
                                </span>
                              ))}
                            {coach.coaching_specialties.length > 3 && (
                              <span className="text-xs text-slate-400">
                                +{coach.coaching_specialties.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            coach.status === "active"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {coach.status}
                        </span>
                        {!isSelectable && (
                          <p className="mt-1 text-xs text-slate-400">
                            Complete onboarding
                          </p>
                        )}
                        {coach.coaching_years > 0 && (
                          <p className="mt-1 text-xs text-slate-500">
                            {coach.coaching_years} yr
                            {coach.coaching_years !== 1 ? "s" : ""} exp
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 px-4 py-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
