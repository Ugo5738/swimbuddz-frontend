/** Decide whether a click is likely to start client-side page navigation. */
export function getNavigationDestination(event: MouseEvent, currentUrl: URL): string | null {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return null;
  }

  const target = event.target instanceof Element
    ? event.target
    : event.target instanceof Node ? event.target.parentElement : null;
  const anchor = target?.closest<HTMLAnchorElement>("a[href]");
  if (!anchor || anchor.hasAttribute("download") || anchor.getAttribute("aria-disabled") === "true") {
    return null;
  }
  const linkTarget = anchor.getAttribute("target");
  if (linkTarget && linkTarget.toLowerCase() !== "_self") return null;

  let destination: URL;
  try {
    destination = new URL(anchor.href, currentUrl.href);
  } catch {
    return null;
  }
  if (destination.origin !== currentUrl.origin) return null;
  // Hash-only changes do not trigger App Router data loading.
  if (destination.pathname === currentUrl.pathname && destination.search === currentUrl.search) {
    return null;
  }
  return destination.pathname + destination.search;
}
