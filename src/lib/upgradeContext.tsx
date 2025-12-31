"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

// ============================================================================
// Types
// ============================================================================

export type ClubBillingCycle = "quarterly" | "biannual" | "annual";

export type Cohort = {
    id: string;
    name: string;
    program_name?: string;
    start_date?: string;
    end_date?: string;
    price?: number;
    status?: string;
};

export type UpgradeState = {
    // What the user is upgrading to
    targetTier: "club" | "academy" | null;

    // Club-specific
    clubBillingCycle: ClubBillingCycle | null;
    clubReadinessComplete: boolean;
    clubReadinessData: {
        availableDays: string[];
        clubNotes: string;
    } | null;

    // Academy-specific
    selectedCohortId: string | null;
    selectedCohort: Cohort | null;
    academyDetailsComplete: boolean;
    academyDetailsData: {
        skillAssessment: Record<string, boolean>;
        goals: string;
        preferredCoachGender: string;
        lessonPreference: string;
    } | null;

    // Common
    discountCode: string;
    includeCommunityExtension: boolean;

    // Community extension info (computed from backend)
    extensionInfo: {
        required: boolean;
        months: number;
        amount: number;
    } | null;

    // Return navigation
    returnTo: string;
};

type UpgradeContextValue = {
    state: UpgradeState;
    // Actions
    setTargetTier: (tier: "club" | "academy") => void;
    setClubBillingCycle: (cycle: ClubBillingCycle) => void;
    setClubReadinessData: (data: UpgradeState["clubReadinessData"]) => void;
    markClubReadinessComplete: () => void;
    setSelectedCohort: (cohort: Cohort) => void;
    setAcademyDetailsData: (data: UpgradeState["academyDetailsData"]) => void;
    markAcademyDetailsComplete: () => void;
    setDiscountCode: (code: string) => void;
    setIncludeCommunityExtension: (include: boolean) => void;
    setExtensionInfo: (info: UpgradeState["extensionInfo"]) => void;
    setReturnTo: (path: string) => void;
    clearState: () => void;
    // Computed
    isClubFlowComplete: boolean;
    isAcademyFlowComplete: boolean;
};

// ============================================================================
// Storage
// ============================================================================

const STORAGE_KEY = "swimbuddz:upgrade:state";
const STORAGE_VERSION = 1;

type StoredState = {
    version: number;
    state: UpgradeState;
    savedAt: number;
};

const MAX_AGE_MS = 1000 * 60 * 60 * 2; // 2 hours

function saveToStorage(state: UpgradeState): void {
    if (typeof window === "undefined") return;
    try {
        const payload: StoredState = {
            version: STORAGE_VERSION,
            state,
            savedAt: Date.now(),
        };
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
        // Ignore storage failures
    }
}

function loadFromStorage(): UpgradeState | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as StoredState;
        if (parsed.version !== STORAGE_VERSION) return null;
        if (Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
        return parsed.state;
    } catch {
        return null;
    }
}

function clearStorage(): void {
    if (typeof window === "undefined") return;
    try {
        window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        // Ignore
    }
}

// ============================================================================
// Default State
// ============================================================================

const defaultState: UpgradeState = {
    targetTier: null,
    clubBillingCycle: null,
    clubReadinessComplete: false,
    clubReadinessData: null,
    selectedCohortId: null,
    selectedCohort: null,
    academyDetailsComplete: false,
    academyDetailsData: null,
    discountCode: "",
    includeCommunityExtension: true,
    extensionInfo: null,
    returnTo: "/dashboard/billing",
};

// ============================================================================
// Context
// ============================================================================

const UpgradeContext = createContext<UpgradeContextValue | null>(null);

export function UpgradeProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<UpgradeState>(defaultState);
    const [hydrated, setHydrated] = useState(false);

    // Hydrate from storage on mount
    useEffect(() => {
        const stored = loadFromStorage();
        if (stored) {
            setState(stored);
        }
        setHydrated(true);
    }, []);

    // Persist to storage on state change
    useEffect(() => {
        if (hydrated) {
            saveToStorage(state);
        }
    }, [state, hydrated]);

    // Actions
    const setTargetTier = useCallback((tier: "club" | "academy") => {
        setState((prev) => ({ ...prev, targetTier: tier }));
    }, []);

    const setClubBillingCycle = useCallback((cycle: ClubBillingCycle) => {
        setState((prev) => ({ ...prev, clubBillingCycle: cycle }));
    }, []);

    const setClubReadinessData = useCallback((data: UpgradeState["clubReadinessData"]) => {
        setState((prev) => ({ ...prev, clubReadinessData: data }));
    }, []);

    const markClubReadinessComplete = useCallback(() => {
        setState((prev) => ({ ...prev, clubReadinessComplete: true }));
    }, []);

    const setSelectedCohort = useCallback((cohort: Cohort) => {
        setState((prev) => ({
            ...prev,
            selectedCohortId: cohort.id,
            selectedCohort: cohort,
        }));
    }, []);

    const setAcademyDetailsData = useCallback((data: UpgradeState["academyDetailsData"]) => {
        setState((prev) => ({ ...prev, academyDetailsData: data }));
    }, []);

    const markAcademyDetailsComplete = useCallback(() => {
        setState((prev) => ({ ...prev, academyDetailsComplete: true }));
    }, []);

    const setDiscountCode = useCallback((code: string) => {
        setState((prev) => ({ ...prev, discountCode: code.toUpperCase() }));
    }, []);

    const setIncludeCommunityExtension = useCallback((include: boolean) => {
        setState((prev) => ({ ...prev, includeCommunityExtension: include }));
    }, []);

    const setExtensionInfo = useCallback((info: UpgradeState["extensionInfo"]) => {
        setState((prev) => ({ ...prev, extensionInfo: info }));
    }, []);

    const setReturnTo = useCallback((path: string) => {
        setState((prev) => ({ ...prev, returnTo: path }));
    }, []);

    const clearState = useCallback(() => {
        setState(defaultState);
        clearStorage();
    }, []);

    // Computed
    const isClubFlowComplete = state.clubReadinessComplete && state.clubBillingCycle !== null;
    const isAcademyFlowComplete = state.academyDetailsComplete && state.selectedCohortId !== null;

    const value: UpgradeContextValue = {
        state,
        setTargetTier,
        setClubBillingCycle,
        setClubReadinessData,
        markClubReadinessComplete,
        setSelectedCohort,
        setAcademyDetailsData,
        markAcademyDetailsComplete,
        setDiscountCode,
        setIncludeCommunityExtension,
        setExtensionInfo,
        setReturnTo,
        clearState,
        isClubFlowComplete,
        isAcademyFlowComplete,
    };

    return <UpgradeContext.Provider value={value}>{children}</UpgradeContext.Provider>;
}

export function useUpgrade(): UpgradeContextValue {
    const context = useContext(UpgradeContext);
    if (!context) {
        throw new Error("useUpgrade must be used within an UpgradeProvider");
    }
    return context;
}

// ============================================================================
// Pricing utilities
// ============================================================================

export const CLUB_PRICING: Record<ClubBillingCycle, number> = {
    quarterly: 42500,
    biannual: 80000,
    annual: 150000,
};

export const COMMUNITY_ANNUAL_FEE = 20000;

export function getClubCycleLabel(cycle: ClubBillingCycle): string {
    switch (cycle) {
        case "quarterly":
            return "Quarterly";
        case "biannual":
            return "Bi-annual";
        case "annual":
            return "Annual";
    }
}

export function formatCurrency(amount: number): string {
    return `₦${amount.toLocaleString("en-NG")}`;
}
