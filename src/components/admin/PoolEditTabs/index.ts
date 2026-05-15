// Re-exports the 5 pool admin tabs that previously lived in a single
// 1,406-line `PoolEditTabs.tsx`. The directory pattern preserves the
// `@/components/admin/PoolEditTabs` import path for the one consumer
// (admin/pools/[poolId]/page.tsx).

export { AgreementsTab } from "./AgreementsTab";
export { AssetsTab } from "./AssetsTab";
export { ContactsTab } from "./ContactsTab";
export { HistoryTab } from "./HistoryTab";
export { VisitsTab } from "./VisitsTab";
