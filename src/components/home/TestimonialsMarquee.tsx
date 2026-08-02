import { Card } from "@/components/ui/Card";
import type { Testimonial } from "@/lib/testimonials";

type VideoTestimonial = {
  id: string;
  file_url: string;
  name: string;
  role: string;
};

type Item =
  | { kind: "video"; value: VideoTestimonial }
  | { kind: "text"; value: Testimonial };

export function TestimonialsMarquee({
  testimonials,
  videoTestimonials,
}: {
  testimonials: Testimonial[];
  videoTestimonials: VideoTestimonial[];
}) {
  const items: Item[] = [
    ...videoTestimonials.map((value): Item => ({ kind: "video", value })),
    ...testimonials.map((value): Item => ({ kind: "text", value })),
  ];

  if (items.length === 0) return null;

  return (
    <div className="testimonial-marquee -mx-4 overflow-hidden py-2 md:-mx-8">
      <div className="testimonial-marquee-track flex w-max">
        <TestimonialGroup items={items} />
        <TestimonialGroup items={items} duplicate />
      </div>
    </div>
  );
}

function TestimonialGroup({ items, duplicate = false }: { items: Item[]; duplicate?: boolean }) {
  return (
    <div
      className="flex shrink-0 items-stretch gap-5 px-2 md:gap-6 md:px-3"
      aria-hidden={duplicate || undefined}
    >
      {items.map((item) => {
        if (item.kind === "video") {
          const testimonial = item.value;
          return (
            <Card
              key={`video-${testimonial.id}-${duplicate ? "copy" : "original"}`}
              className="w-[min(84vw,23rem)] shrink-0 overflow-hidden p-0"
            >
              <div className="relative aspect-video bg-slate-900">
                <video
                  src={testimonial.file_url}
                  controls={!duplicate}
                  muted={duplicate}
                  preload="metadata"
                  playsInline
                  tabIndex={duplicate ? -1 : undefined}
                  className="h-full w-full object-contain"
                />
              </div>
              <Person name={testimonial.name} role={testimonial.role} />
            </Card>
          );
        }

        const testimonial = item.value;
        return (
          <Card
            key={`text-${testimonial.id}-${duplicate ? "copy" : "original"}`}
            className="relative flex w-[min(84vw,23rem)] shrink-0 overflow-hidden text-left"
          >
            <div className="absolute left-3 top-0 font-serif text-6xl leading-none text-cyan-100">
              &quot;
            </div>
            <div className="relative flex min-h-64 flex-col justify-between p-6 pt-8">
              <p className="text-lg italic leading-relaxed text-slate-700">
                &quot;{testimonial.quote}&quot;
              </p>
              <Person
                name={testimonial.name}
                role={`${testimonial.role}${testimonial.since ? ` since ${testimonial.since}` : ""}`}
                initials={testimonial.initials}
              />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function Person({ name, role, initials }: { name: string; role?: string; initials?: string }) {
  const displayInitials =
    initials ||
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  return (
    <div className="flex items-center gap-3 border-t border-slate-100 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 text-sm font-bold text-white">
        {displayInitials}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-cyan-700">{name}</p>
        {role && <p className="truncate text-xs text-slate-500">{role}</p>}
      </div>
    </div>
  );
}
