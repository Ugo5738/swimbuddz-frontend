type SocialLinksProps = {
  /** Icon size in Tailwind units. Default: 5 (20px). */
  size?: 4 | 5 | 6;
  /** Base text color class for the icons. */
  tone?: string;
  /** Hover text color class. */
  hoverTone?: string;
  /** Extra classes for the wrapper. */
  className?: string;
};

const SIZE_CLASS: Record<NonNullable<SocialLinksProps["size"]>, string> = {
  4: "h-4 w-4",
  5: "h-5 w-5",
  6: "h-6 w-6",
};

/**
 * Shared Instagram + TikTok link icons for site footers.
 * Single source of truth for the SwimBuddz social handles.
 */
export function SocialLinks({
  size = 5,
  tone = "text-slate-500",
  hoverTone = "hover:text-cyan-700",
  className = "",
}: SocialLinksProps) {
  const sizeClass = SIZE_CLASS[size];
  const linkClass = `${tone} transition ${hoverTone}`;

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <a
        href="https://www.instagram.com/swimbuddz/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="SwimBuddz on Instagram"
        className={linkClass}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={sizeClass}
          aria-hidden="true"
        >
          <rect x="2" y="2" width="20" height="20" rx="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
      </a>
      <a
        href="https://www.tiktok.com/@swimbuddz"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="SwimBuddz on TikTok"
        className={linkClass}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className={sizeClass} aria-hidden="true">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z" />
        </svg>
      </a>
    </div>
  );
}
