"use client";

import { Card } from "@/components/ui/Card";
import { API_BASE_URL } from "@/lib/config";
import Link from "next/link";
import { useEffect, useState } from "react";

const whoSwimBudzIsFor = [
  {
    title: "Beginners",
    description: "Start from zero in a safe, supportive environment. Learn water confidence, breathing and basic strokes.",
    icon: "🌊",
    gradient: "from-cyan-400 to-blue-500"
  },
  {
    title: "Fitness Swimmers",
    description: "Improve your technique, build endurance, and stay consistent with weekly group sessions.",
    icon: "💪",
    gradient: "from-emerald-400 to-teal-500"
  },
  {
    title: "Competitive / Ocean Curious",
    description: "Explore more advanced training, challenges and open-water goals over time.",
    icon: "🏊",
    gradient: "from-purple-400 to-indigo-500"
  }
];

const tiers = [
  {
    name: "Community",
    description: "Join a welcoming space to connect with other swimming enthusiasts.",
    benefits: [
      "Access to Global Community Network of swimmers",
      "Access to Community Events & Socials",
      "Basic member profile",
      "Access to Swim tips & education",
      "Community group chats",
      "Volunteer opportunities (media, logistics, etc.)",
      "Access to SwimBuddz merchandise",
    ],
    pricing: "Free",
    link: "/community",
    accent: "cyan"
  },
  {
    name: "Club",
    description: "For swimmers who want to make swimming a lifestyle, with structured, ongoing improvement and an active training group.",
    benefits: [
      "Regular training exercises",
      "Improvement at your own pace",
      "Track your times & performance",
      "Team culture & challenges",
      "Everything in Community",
      "Exclusive club events",
      "Monthly subscription"
    ],
    pricing: "Paid Monthly",
    link: "/club",
    accent: "blue",
    featured: true
  },
  {
    name: "Academy",
    description: "A formal training program with a curriculum, assessments, and certification.",
    benefits: [
      "Structured curriculum/milestones",
      "Coach-assigned drills and goals",
      "Certification",
      "Cohort-based program",
      "Higher-value, deeper experience",
      "Everything in Community & Club"
    ],
    pricing: "Paid — Cohort Based",
    link: "/academy",
    accent: "purple"
  }
];

const howItWorks = [
  {
    step: "1",
    title: "Join the Community",
    description: "Create your profile, choose your tier, and get plugged into announcements & groups."
  },
  {
    step: "2",
    title: "Pick Your Path",
    description: "Join Club training sessions or enroll in Academy cohorts when you're ready."
  },
  {
    step: "3",
    title: "Show Up Consistently",
    description: "Attend sessions, practice drills, and track your progress."
  },
  {
    step: "4",
    title: "Grow With the Pod",
    description: "Take on challenges, volunteer, and be part of building SwimBuddz."
  }
];

const testimonials = [
  {
    quote: "I went from being afraid of water to swimming across the pool confidently.",
    author: "SwimBuddz Member"
  },
  {
    quote: "The group energy keeps me showing up, even on slow days.",
    author: "Club Member"
  },
  {
    quote: "SwimBuddz gave me the structure I needed to finally learn how to swim properly.",
    author: "Academy Graduate"
  }
];

// Default placeholder hero images (used when no admin-uploaded banners exist)
const defaultHeroImages = [
  "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1920&q=80",
  "https://images.unsplash.com/photo-1519315901367-f34ff9154487?w=1920&q=80",
  "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1920&q=80",
];

// Wave SVG component for decorative borders
function WaveDecoration({ className = "", flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 1200 120"
      preserveAspectRatio="none"
      className={`w-full ${flip ? 'rotate-180' : ''} ${className}`}
    >
      <path
        d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
        fill="currentColor"
        opacity="0.25"
      />
      <path
        d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z"
        fill="currentColor"
        opacity="0.5"
      />
      <path
        d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"
        fill="currentColor"
      />
    </svg>
  );
}

type GalleryPhoto = {
  id: string;
  file_url: string;
  thumbnail_url?: string;
  title?: string;
};

export default function HomePage() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [heroImages, setHeroImages] = useState<string[]>(defaultHeroImages);

  // Fetch admin-uploaded banner images
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/media/assets`);
        if (response.ok) {
          const assets = await response.json();
          const bannerUrls = assets
            .filter((a: any) => a.key.startsWith("homepage_banner_") && a.media_item?.file_url)
            .sort((a: any, b: any) => {
              const orderA = parseInt(a.key.split("_").pop() || "0");
              const orderB = parseInt(b.key.split("_").pop() || "0");
              return orderA - orderB;
            })
            .map((a: any) => a.media_item.file_url);

          if (bannerUrls.length > 0) {
            setHeroImages(bannerUrls);
          }
        }
      } catch (error) {
        console.error("Failed to fetch banners:", error);
        // Keep default images on error
      }
    };
    fetchBanners();
  }, []);

  // Rotate hero images
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

  // Fetch community showcase photos (from admin-configured assets)
  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/media/assets`);
        if (response.ok) {
          const assets = await response.json();
          const communityPhotos = assets
            .filter((a: any) => a.key.startsWith("community_photo_") && a.media_item?.file_url)
            .sort((a: any, b: any) => {
              const orderA = parseInt(a.key.split("_").pop() || "0");
              const orderB = parseInt(b.key.split("_").pop() || "0");
              return orderA - orderB;
            })
            .map((a: any) => ({
              id: a.id,
              file_url: a.media_item.file_url,
              thumbnail_url: a.media_item.thumbnail_url,
              title: a.description || "SwimBuddz community",
            }));

          if (communityPhotos.length > 0) {
            setGalleryPhotos(communityPhotos);
          }
        }
      } catch (error) {
        console.error("Failed to fetch community photos:", error);
      }
    };
    fetchPhotos();
  }, []);

  const handleImageLoad = (id: string) => {
    setLoadedImages(prev => new Set(prev).add(id));
  };

  return (
    <div className="space-y-20">
      {/* 1. HERO SECTION - Full screen height, full width */}
      <section className="relative overflow-hidden min-h-[85vh] flex items-center -mx-4 md:-mx-[calc(50vw-50%)] w-[calc(100%+2rem)] md:w-screen" style={{ marginTop: '-2rem' }}>
        {/* Background Image Slideshow */}
        <div className="absolute inset-0">
          {heroImages.map((img, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 transition-opacity duration-1000 ${idx === currentImageIndex ? 'opacity-100' : 'opacity-0'
                }`}
            >
              <img
                src={img}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          ))}
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-cyan-900/70 to-blue-900/80" />

          {/* Animated gradient orbs */}
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl animate-pulse" />
          <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

          {/* Wave pattern at bottom */}
          <div className="absolute bottom-0 left-0 right-0 text-slate-900/50 h-24">
            <WaveDecoration className="h-full" />
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-6 py-20 md:px-12">
          <div className="max-w-3xl space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 text-sm font-medium text-white">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              Building globally • Currently active in Lagos
            </div>

            <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
              Learn, train, and enjoy swimming with{" "}
              <span className="relative inline-block">
                <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300">
                  our swimming community
                </span>
              </span>
            </h1>

            <p className="text-lg text-slate-200 max-w-2xl md:text-xl">
              SwimBuddz connects beginners, fitness swimmers, and competitors in a structured but friendly swim community.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row pt-2">
              <Link
                href="/register"
                className="group relative inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-lg font-semibold text-cyan-700 transition-all hover:bg-cyan-50 hover:scale-105 hover:shadow-xl hover:shadow-white/20"
              >
                <span className="relative z-10">Join SwimBuddz</span>
              </Link>
              <Link
                href="/sessions-and-events"
                className="inline-flex items-center justify-center rounded-full border-2 border-white/50 backdrop-blur-sm px-8 py-4 text-lg font-semibold text-white transition-all hover:bg-white/10 hover:border-white hover:scale-105"
              >
                View Upcoming Sessions
              </Link>
            </div>
          </div>
        </div>

        {/* Slide indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {heroImages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentImageIndex(idx)}
              className={`w-2 h-2 rounded-full transition-all ${idx === currentImageIndex ? 'bg-white w-8' : 'bg-white/50'
                }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </section>

      {/* 2. WHO SWIMBUDDZ IS FOR */}
      <section className="space-y-10">
        <div className="text-center space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
            For Everyone
          </p>
          <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
            Who SwimBuddz Is For
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {whoSwimBudzIsFor.map((audience) => (
            <Card key={audience.title} className="group relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
              <div className={`absolute inset-0 bg-gradient-to-br ${audience.gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />
              <div className="relative space-y-4 text-center p-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 text-4xl shadow-sm">
                  {audience.icon}
                </div>
                <h3 className="text-xl font-semibold text-slate-900">{audience.title}</h3>
                <p className="text-slate-600">{audience.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 3. TIERS OVERVIEW */}
      <section className="space-y-10">
        <div className="text-center space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
            Three Tiers
          </p>
          <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
            Choose Your Level of Commitment
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Start with Community, upgrade to Club for consistent training, or join Academy for structured learning.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={`relative overflow-hidden transition-all hover:shadow-lg ${tier.featured ? 'ring-2 ring-cyan-500 shadow-lg md:-translate-y-2' : ''
                }`}
            >
              {tier.featured && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-cyan-500 to-blue-500 py-1.5 text-center text-xs font-semibold text-white">
                  Most Popular
                </div>
              )}
              <div className={`space-y-6 ${tier.featured ? 'pt-10' : 'pt-6'} p-6`}>
                <div>
                  <h3 className="text-2xl font-bold text-cyan-700">{tier.name}</h3>
                  <p className="text-slate-600 mt-2">{tier.description}</p>
                  <p className="text-sm font-semibold text-slate-500 mt-3">{tier.pricing}</p>
                </div>
                <ul className="space-y-3">
                  {tier.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      <span className="text-slate-700">{benefit}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier.link}
                  className={`block text-center font-semibold py-3 rounded-xl transition-all ${tier.featured
                    ? 'bg-cyan-600 text-white hover:bg-cyan-500'
                    : 'bg-slate-100 text-cyan-700 hover:bg-slate-200'
                    }`}
                >
                  Learn more →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* SHOP SECTION */}
      <section className="space-y-6 rounded-2xl bg-gradient-to-br from-cyan-50 to-white border border-cyan-100 p-8 md:p-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">SwimBuddz Gear</h2>
            <p className="text-slate-600 mt-2">
              Browse our collection of swim essentials — goggles, caps, training equipment and more.
            </p>
          </div>
          <Link
            href="/store"
            className="inline-flex items-center gap-2 rounded-full bg-cyan-600 px-6 py-3 font-semibold text-white hover:bg-cyan-500 transition-all hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/25 self-start"
          >
            Visit Shop
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {["🥽 Goggles", "🏊 Caps", "🎽 Swimwear", "🏋️ Training"].map((item, idx) => (
            <Link
              key={idx}
              href="/store"
              className="group bg-white rounded-xl p-6 text-center border border-slate-100 hover:border-cyan-200 hover:shadow-md transition-all"
            >
              <span className="text-3xl block mb-2">{item.split(" ")[0]}</span>
              <span className="text-sm font-medium text-slate-700 group-hover:text-cyan-700">{item.split(" ").slice(1).join(" ")}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. SESSIONS & EVENTS PREVIEW */}
      <section className="space-y-6 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 p-8 md:p-10">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Upcoming Sessions & Events</h2>
          <p className="text-slate-600 mt-2">
            Join training sessions or RSVP to community events.
          </p>
        </div>
        <Card className="p-8 text-center bg-white/80 backdrop-blur">
          <p className="text-slate-600 mb-6">
            View the full calendar of club sessions and community events.
          </p>
          <Link
            href="/sessions-and-events"
            className="inline-flex items-center gap-2 rounded-full bg-cyan-600 px-8 py-3.5 font-semibold text-white hover:bg-cyan-500 transition-all hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/25"
          >
            View Full Calendar
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </Card>
      </section>

      {/* 5. COMMUNITY HIGHLIGHTS / PHOTOS */}
      <section className="space-y-10">
        <div className="text-center space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
            Our Community
          </p>
          <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
            Building a Culture Together
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            We&apos;re building a culture of consistency, safety and fun in and out of the pool.
          </p>
        </div>

        {/* Photo grid - real photos or placeholders */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {galleryPhotos.length > 0 ? (
            galleryPhotos.map((photo) => (
              <div
                key={photo.id}
                className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100"
              >
                {!loadedImages.has(photo.id) && (
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-100 to-cyan-200 animate-pulse flex items-center justify-center">
                    <span className="text-4xl">🏊</span>
                  </div>
                )}
                <img
                  src={photo.file_url || photo.thumbnail_url}
                  alt={photo.title || "SwimBuddz community"}
                  className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${loadedImages.has(photo.id) ? 'opacity-100' : 'opacity-0'
                    }`}
                  onLoad={() => handleImageLoad(photo.id)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))
          ) : (
            // Placeholder cards
            [1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="group relative aspect-square rounded-2xl bg-gradient-to-br from-cyan-100 to-cyan-200 flex items-center justify-center overflow-hidden transition-all hover:shadow-lg"
              >
                <span className="text-4xl md:text-5xl group-hover:scale-110 transition-transform">🏊</span>
                <div className="absolute inset-0 bg-gradient-to-t from-cyan-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))
          )}
        </div>

        <div className="text-center">
          <Link
            href="/gallery"
            className="inline-flex items-center gap-2 rounded-full border-2 border-cyan-600 px-8 py-3.5 font-semibold text-cyan-700 hover:bg-cyan-50 transition-all hover:scale-105"
          >
            Browse Gallery
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* 6. HOW IT WORKS */}
      <section className="space-y-10">
        <div className="text-center space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
            Simple Process
          </p>
          <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
            How It Works
          </h2>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {howItWorks.map((step, idx) => (
            <div key={step.step} className="relative space-y-4">
              {/* Connector line for desktop */}
              {idx < howItWorks.length - 1 && (
                <div className="hidden lg:block absolute top-6 left-[60%] w-full h-0.5 bg-gradient-to-r from-cyan-200 to-transparent" />
              )}
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 text-xl font-bold text-white shadow-lg shadow-cyan-500/25">
                {step.step}
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
              <p className="text-sm text-slate-600">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. TESTIMONIALS */}
      <section className="space-y-10 bg-gradient-to-br from-slate-50 to-white -mx-4 px-4 py-12 md:-mx-8 md:px-8 rounded-3xl">
        <div className="text-center space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
            Member Stories
          </p>
          <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
            What Our Swimmers Say
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((testimonial, idx) => (
            <Card key={idx} className="relative overflow-hidden">
              <div className="absolute top-0 left-0 text-6xl text-cyan-100 font-serif leading-none">&quot;</div>
              <div className="relative space-y-4 p-6 pt-8">
                <p className="text-slate-700 italic text-lg">&quot;{testimonial.quote}&quot;</p>
                <p className="text-sm font-semibold text-cyan-700">— {testimonial.author}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 8. FINAL CTA STRIP */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-16 text-center text-white shadow-2xl md:px-12 md:py-20">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Wave at top */}
          <div className="absolute top-0 left-0 right-0 text-cyan-500/20">
            <WaveDecoration flip />
          </div>

          {/* Gradient orbs */}
          <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute top-1/2 right-1/4 translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

          {/* Subtle pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.1),transparent_70%)]" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl font-bold md:text-4xl lg:text-5xl">
            Ready to swim with people who{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              actually show up?
            </span>
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Join SwimBuddz and start your next chapter in the water.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center pt-4">
            <Link
              href="/register"
              className="group relative inline-flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-cyan-600 px-8 py-4 text-lg font-semibold text-white transition-all hover:scale-105 hover:shadow-xl hover:shadow-cyan-500/25"
            >
              <span className="relative z-10">Join SwimBuddz</span>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center justify-center rounded-full border-2 border-white/30 px-8 py-4 text-lg font-semibold text-white transition-all hover:bg-white/10 hover:border-white/50 hover:scale-105"
            >
              Learn More About Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
