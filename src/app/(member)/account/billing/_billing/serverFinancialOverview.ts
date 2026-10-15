/** Read-only Payments Service financial summary; amounts are integer kobo. */
export type ServerObligation = {
  id: string;
  source: "academy" | "session";
  title: string;
  detail: string;
  amount_kobo: number;
  due_at: string | null;
  status: "due" | "overdue" | "upcoming" | "checking";
  href: string;
};
export type ServerFinancialOverview = {
  items: ServerObligation[];
  optional_purchases: Array<{
    id: string; title: string; status: string; amount_kobo: number; href: string;
  }>;
  unpriced: Array<{ source: string; id: string; title: string; href: string }>;
  due_kobo: number;
  upcoming_kobo: number;
  checking_kobo: number;
  sources_unavailable: string[];
  complete: boolean;
  as_of: string;
};
