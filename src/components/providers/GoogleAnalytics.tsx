"use client";

import { GA_ID, isGAEnabled, trackPageView } from "@/lib/analytics";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { Suspense, useEffect } from "react";

/**
 * Tracks client-side route changes in the App Router.
 * Wrapped in its own component so Suspense can handle useSearchParams().
 */
function RouteChangeTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isGAEnabled()) return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    trackPageView(url);
  }, [pathname, searchParams]);

  return null;
}

/**
 * Drop this component once in the root layout.
 * It loads the gtag.js script and auto-tracks page views on route changes.
 *
 * Does nothing when NEXT_PUBLIC_GA_ID is not set (local dev / preview).
 */
export function GoogleAnalytics() {
  if (!isGAEnabled()) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            page_path: window.location.pathname,
            send_page_view: true
          });
        `}
      </Script>
      <Suspense fallback={null}>
        <RouteChangeTracker />
      </Suspense>
    </>
  );
}
