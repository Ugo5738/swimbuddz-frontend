/** Route contracts: keep legacy session browsing links functional. */
export function sessionDiscoveryUrl(params: URLSearchParams): string {
  const query = new URLSearchParams(params);
  const view = query.get("view");
  if (view === "my" || view === "booked") return "/account/bookings?view=upcoming";
  if (view === "booked") return "/account/bookings?view=upcoming";
  if (view === "past") return "/account/bookings?view=past";
  return `/find-a-swim/sessions${query.size ? `?${query.toString()}` : ""}`;
}
