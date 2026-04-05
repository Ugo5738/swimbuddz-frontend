"use client";

import { TestimonialStrip } from "@/components/academy/TestimonialStrip";
import { fetchTestimonials, type Testimonial, type TestimonialTrack } from "@/lib/testimonials";
import { useEffect, useState } from "react";

type Props = {
  track: TestimonialTrack;
};

/**
 * Fetches testimonials for a given track on mount, then renders the
 * TestimonialStrip. Falls back to the local list via fetchTestimonials
 * if the backend is unreachable.
 */
export function LiveTestimonials({ track }: Props) {
  const [testimonials, setTestimonials] = useState<Testimonial[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchTestimonials(track).then((list) => {
      if (!cancelled) setTestimonials(list);
    });
    return () => {
      cancelled = true;
    };
  }, [track]);

  // Hide entirely until we have data (avoids SSR/CSR flash)
  if (testimonials === null) return null;

  return <TestimonialStrip testimonials={testimonials} />;
}
