"use client";

import { ChallengesCarousel } from "@/components/home/ChallengesCarousel";
import { Card } from "@/components/ui/Card";
import { fetchTestimonials, getTestimonials, type Testimonial } from "@/lib/testimonials";
import {
  CATEGORY_LABELS,
  SpotlightData,
  VolunteersApi,
  type VolunteerRoleCategory,
} from "@/lib/volunteers";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  fetchHomepageBanners,
  fetchHomepageMedia,
  fetchSpotlightPhotoMap,
} from "./_homepage/api";
import {
  comparisonFeatures,
  defaultHeroImages,
  FALLBACK_SPOTLIGHT,
  tiers,
  trustBadgeMessages,
  type GalleryPhoto,
  type VideoTestimonial,
} from "./_homepage/data";
import { HowItWorks } from "./_homepage/HowItWorks";
import { getDisplayName } from "./_homepage/utils";
import { WaveDecoration } from "./_homepage/WaveDecoration";
import { WhoItsFor } from "./_homepage/WhoItsFor";

// Fallback list shown while backend request is in flight / unreachable.
const fallbackTestimonials = getTestimonials("all");

export default function HomePage() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [galleryVideo, setGalleryVideo] = useState<string | null>(null);
  const [videoTestimonials, setVideoTestimonials] = useState<VideoTestimonial[]>([]);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [heroImages, setHeroImages] = useState<string[]>(defaultHeroImages);
  const [spotlight, setSpotlight] = useState<SpotlightData | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [trustBadgeIndex, setTrustBadgeIndex] = useState(0);
  const [roleMap, setRoleMap] = useState<Record<string, string>>({});
  const [photoMap, setPhotoMap] = useState<Record<string, string>>({});
  const [testimonials, setTestimonials] = useState<Testimonial[]>(fallbackTestimonials);

  // Fetch published testimonials from backend (falls back to static list)
  useEffect(() => {
    let cancelled = false;
    fetchTestimonials("all").then((list) => {
      if (!cancelled && list.length > 0) setTestimonials(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch admin-uploaded banner images
  useEffect(() => {
    fetchHomepageBanners().then((urls) => {
      if (urls.length > 0) setHeroImages(urls);
    });
  }, []);

  // Rotate hero images
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

  // Fetch community showcase photos, gallery video, and video testimonials
  useEffect(() => {
    fetchHomepageMedia().then(({ galleryPhotos, galleryVideo, videoTestimonials }) => {
      if (galleryPhotos.length > 0) setGalleryPhotos(galleryPhotos);
      if (galleryVideo) setGalleryVideo(galleryVideo);
      if (videoTestimonials.length > 0) setVideoTestimonials(videoTestimonials);
    });
  }, []);

  // Fetch volunteer spotlight data (with fallback)
  useEffect(() => {
    const fetchSpotlight = async () => {
      try {
        const data = await VolunteersApi.getSpotlight();
        setSpotlight(data);
      } catch (error) {
        console.error("Failed to fetch volunteer spotlight:", error);
        setSpotlight(FALLBACK_SPOTLIGHT);
      }
    };
    fetchSpotlight();
  }, []);

  // Fetch profile photos for spotlight volunteers from members service
  useEffect(() => {
    if (!spotlight) return;
    const memberIds = new Set<string>();
    if (spotlight.featured_volunteer && spotlight.featured_volunteer.member_id !== "fallback") {
      memberIds.add(spotlight.featured_volunteer.member_id);
    }
    spotlight.top_volunteers?.forEach((v) => memberIds.add(v.member_id));

    if (memberIds.size === 0) return;

    fetchSpotlightPhotoMap(memberIds).then((map) => {
      if (Object.keys(map).length > 0) setPhotoMap(map);
    });
  }, [spotlight]);

  // Fetch volunteer role names so we can resolve UUIDs → titles
  useEffect(() => {
    VolunteersApi.listRoles()
      .then((roles) => {
        const map: Record<string, string> = {};
        roles.forEach((r) => {
          map[r.id] = r.title;
        });
        setRoleMap(map);
      })
      .catch(() => {});
  }, []);

  // Alternate trust badge messages
  useEffect(() => {
    const interval = setInterval(() => {
      setTrustBadgeIndex((prev) => (prev + 1) % trustBadgeMessages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleImageLoad = (id: string) => {
    setLoadedImages((prev) => new Set(prev).add(id));
  };

  // Gallery photo captions (for the first 2 photos)
  const galleryCaptions: Record<number, string> = {
    0: "Saturday morning session at Rowe Park",
    1: "Academy cohort graduation day",
  };

  return (
    <div className="space-y-20">
      {/* ─── 1. HERO SECTION ─────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden min-h-[60vh] sm:min-h-[85vh] flex items-center -mx-4 md:-mx-[calc(50vw-50%)] w-[calc(100%+2rem)] md:w-screen"
        style={{ marginTop: "-2rem" }}
      >
        {/* Background Image Slideshow */}
        <div className="absolute inset-0">
          {heroImages.map((img, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                idx === currentImageIndex ? "opacity-100" : "opacity-0"
              }`}
            >
              <Image
                src={img}
                alt=""
                fill
                sizes="100vw"
                className="object-cover object-top sm:object-center"
                priority={idx === 0}
              />
            </div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-cyan-900/70 to-blue-900/80" />
          <div className="hidden sm:block absolute -top-24 -right-24 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl animate-pulse" />
          <div
            className="hidden sm:block absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          />
          <div className="absolute bottom-0 left-0 right-0 text-slate-900/50 h-16 sm:h-24">
            <WaveDecoration className="h-full" />
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-6 py-20 md:px-12">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 text-sm font-medium text-white">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              {trustBadgeMessages[trustBadgeIndex]}
            </div>

            <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
              Learn, train, and enjoy swimming with{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300">
                our swimming community
              </span>
            </h1>

            <p className="text-xl text-cyan-100/90 max-w-2xl md:text-2xl">
              Scared of deep water? You&apos;re not alone. Join 60+ swimmers in Lagos who started
              exactly where you are.
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
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentImageIndex ? "bg-white w-8" : "bg-white/50"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </section>

      {/* ─── 2. WHO SWIMBUDDZ IS FOR ────────────────────────────────── */}
      <WhoItsFor />

      {/* ─── 3. COMMUNITY GALLERY ────────────────────────────────────── */}
      {/* Note: Live Challenges section moved DOWN to after "How It Works"
          (section 5 below) — visitors need to know what SwimBuddz is
          before active challenges become legible social proof. */}
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

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {/* Gallery video — spans 2 columns for visual prominence */}
          {galleryVideo && (
            <div className="group relative aspect-[2/1] col-span-2 rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center">
              <video
                src={galleryVideo}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-contain"
              />
            </div>
          )}
          {/* Photos — show all when video present */}
          {galleryPhotos.length > 0
            ? galleryPhotos.slice(0, galleryVideo ? 7 : 6).map((photo, idx) => (
                <div
                  key={photo.id}
                  className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100"
                >
                  {!loadedImages.has(photo.id) && (
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-100 to-cyan-200 animate-pulse flex items-center justify-center">
                      <span className="text-4xl">🏊</span>
                    </div>
                  )}
                  <Image
                    src={photo.thumbnail_url || photo.file_url}
                    alt={photo.title || "SwimBuddz community"}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className={`object-cover transition-all duration-500 group-hover:scale-105 ${
                      loadedImages.has(photo.id) ? "opacity-100" : "opacity-0"
                    }`}
                    onLoad={() => handleImageLoad(photo.id)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  {/* Captions on first 2 photos */}
                  {galleryCaptions[idx] && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                      <p className="text-white text-xs font-medium">{galleryCaptions[idx]}</p>
                    </div>
                  )}
                </div>
              ))
            : !galleryVideo &&
              [1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="group relative aspect-square rounded-2xl bg-gradient-to-br from-cyan-100 to-cyan-200 flex items-center justify-center overflow-hidden transition-all hover:shadow-lg"
                >
                  <span className="text-4xl md:text-5xl group-hover:scale-110 transition-transform">
                    🏊
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-t from-cyan-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
          {/* Browse Gallery CTA card — fills remaining grid cell */}
          {(galleryPhotos.length > 0 || galleryVideo) && (
            <Link
              href="/gallery"
              className="group relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-cyan-50 to-cyan-100 flex flex-col items-center justify-center gap-3 hover:from-cyan-100 hover:to-cyan-200 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-cyan-200 group-hover:bg-cyan-300 flex items-center justify-center transition-colors">
                <svg
                  className="w-6 h-6 text-cyan-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </div>
              <span className="text-sm font-semibold text-cyan-700 group-hover:text-cyan-800">
                Browse Full Gallery
              </span>
              <svg
                className="w-4 h-4 text-cyan-600 group-hover:translate-x-0.5 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          )}
        </div>
      </section>

      {/* ─── 4. HOW IT WORKS ─────────────────────────────────────────── */}
      {/* (Live Challenges renders just below this section — see section 5.) */}
      <HowItWorks />

      {/* ─── 5. LIVE CHALLENGES (auto-hides if no public challenges) ─── */}
      {/* Moved here from section 2: a first-time visitor is now oriented
          by sections 1-4 (hero, who-it's-for, gallery, how-it-works)
          before the carousel asks them to engage with what's running.
          Sits next to Community Spotlight + Testimonials below — the
          three together form a "community is alive" social-proof block. */}
      <ChallengesCarousel />

      {/* ─── 6. COMMUNITY SPOTLIGHT ──────────────────────────────────── */}
      {spotlight && (
        <section className="space-y-10 bg-gradient-to-br from-amber-50/50 via-white to-cyan-50/50 -mx-4 px-4 py-12 md:-mx-8 md:px-8 rounded-3xl">
          <div className="text-center space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-600">
              Our Community
            </p>
            <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">Community Spotlight</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-4">
            {/* Volunteer of the Month - larger card */}
            {spotlight.featured_volunteer && (
              <Card className="md:col-span-2 relative overflow-hidden border-amber-200 bg-gradient-to-br from-amber-50 to-white">
                <div className="absolute top-4 right-4 text-3xl">🏆</div>
                <div className="p-6 flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-5">
                  {/* Prominent avatar */}
                  <div className="flex-shrink-0">
                    {photoMap[spotlight.featured_volunteer.member_id] ||
                    spotlight.featured_volunteer.profile_photo_url ? (
                      <div className="relative w-32 h-32 overflow-hidden rounded-full ring-4 ring-amber-200 shadow-lg">
                        <Image
                          src={
                            photoMap[spotlight.featured_volunteer.member_id] ||
                            spotlight.featured_volunteer.profile_photo_url!
                          }
                          alt={getDisplayName(spotlight.featured_volunteer.member_name)}
                          fill
                          sizes="128px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-white text-4xl font-bold ring-4 ring-amber-200 shadow-lg">
                        {getDisplayName(spotlight.featured_volunteer.member_name)
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                      Volunteer of the Month
                    </p>
                    <h3 className="text-xl font-bold text-slate-900">
                      {getDisplayName(spotlight.featured_volunteer.member_name)}
                    </h3>
                    {(() => {
                      const roleId = spotlight.featured_volunteer.preferred_roles?.[0];
                      if (!roleId) return null;
                      const label =
                        roleMap[roleId] || CATEGORY_LABELS[roleId as VolunteerRoleCategory];
                      if (!label) return null;
                      return <p className="text-sm text-amber-700 font-medium">{label}</p>;
                    })()}
                    <p className="text-sm text-slate-500">
                      {spotlight.featured_volunteer.total_hours} hours contributed
                    </p>
                    {spotlight.featured_volunteer.spotlight_quote && (
                      <p className="text-slate-600 italic text-sm mt-2">
                        &quot;{spotlight.featured_volunteer.spotlight_quote}&quot;
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Top contributors - cards with larger avatars */}
            {spotlight.top_volunteers
              ?.filter(
                (v) =>
                  getDisplayName(v.member_name) !== "Volunteer" &&
                  v.member_id !== spotlight.featured_volunteer?.member_id
              )
              .slice(0, spotlight.featured_volunteer ? 2 : 4)
              .map((volunteer, idx) => (
                <Card
                  key={idx}
                  className="p-6 text-center hover:shadow-md transition-shadow flex flex-col items-center"
                >
                  {photoMap[volunteer.member_id] ? (
                    <div className="relative w-32 h-32 overflow-hidden rounded-full ring-4 ring-cyan-200 shadow-lg mb-3">
                      <Image
                        src={photoMap[volunteer.member_id]}
                        alt={getDisplayName(volunteer.member_name)}
                        fill
                        sizes="128px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-500 flex items-center justify-center text-white text-3xl font-bold mb-3 ring-4 ring-cyan-200 shadow-lg">
                      {getDisplayName(volunteer.member_name)
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                  )}
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-600">
                    Top Contributor
                  </p>
                  <p className="font-semibold text-slate-900 text-sm">
                    {getDisplayName(volunteer.member_name)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {volunteer.total_hours} hrs (all-time)
                  </p>
                  {volunteer.recognition_tier && (
                    <span
                      className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                        volunteer.recognition_tier === "gold"
                          ? "bg-amber-100 text-amber-700"
                          : volunteer.recognition_tier === "silver"
                            ? "bg-slate-100 text-slate-700"
                            : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {volunteer.recognition_tier.charAt(0).toUpperCase() +
                        volunteer.recognition_tier.slice(1)}
                    </span>
                  )}
                </Card>
              ))}
          </div>

          {/* Impact counter */}
          <div className="text-center space-y-3">
            <p className="text-lg text-slate-700">
              Our volunteers have contributed{" "}
              <span className="font-bold text-amber-600">
                {spotlight.total_hours_all_time}+ hours
              </span>{" "}
              to the community
            </p>
            <Link
              href="/volunteer"
              className="inline-flex items-center gap-1 text-sm font-medium text-cyan-600 hover:text-cyan-700 transition-colors"
            >
              Learn more about volunteering
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        </section>
      )}

      {/* ─── 7. TESTIMONIALS ─────────────────────────────────────────── */}
      <section className="space-y-10 bg-gradient-to-br from-slate-50 to-white -mx-4 px-4 py-12 md:-mx-8 md:px-8 rounded-3xl">
        <div className="text-center space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
            Member Stories
          </p>
          <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">What Our Swimmers Say</h2>
        </div>
        <div
          className={`grid gap-6 items-start ${
            videoTestimonials.length > 0 ? "md:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-3"
          }`}
        >
          {/* Video testimonials first */}
          {videoTestimonials.map((vt) => (
            <Card key={vt.id} className="relative overflow-hidden">
              <div className="relative aspect-video bg-slate-900 flex items-center justify-center">
                <video
                  src={vt.file_url}
                  controls
                  preload="metadata"
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {vt.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-cyan-700">{vt.name}</p>
                  {vt.role && <p className="text-xs text-slate-500">{vt.role}</p>}
                </div>
              </div>
            </Card>
          ))}

          {/* Text testimonials */}
          {testimonials.map((testimonial, idx) => (
            <Card key={idx} className="relative overflow-hidden text-center md:text-left">
              <div className="absolute top-0 left-0 text-6xl text-cyan-100 font-serif leading-none">
                &quot;
              </div>
              <div className="relative flex flex-col p-6 pt-8">
                <p className="text-slate-700 italic text-lg">&quot;{testimonial.quote}&quot;</p>
                <div className="flex items-center gap-3 justify-center md:justify-start mt-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {testimonial.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-cyan-700">{testimonial.name}</p>
                    <p className="text-xs text-slate-500">
                      {testimonial.role} since {testimonial.since}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── 8. PRICING TIERS ────────────────────────────────────────── */}
      <section className="space-y-10">
        <div className="text-center space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
            Three Tiers
          </p>
          <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
            Choose Your Level of Commitment
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Start with Community, upgrade to Club for consistent training, or join Academy for
            structured learning.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={`relative overflow-hidden transition-all hover:shadow-lg ${
                tier.featured ? "ring-2 ring-cyan-500 shadow-lg md:-translate-y-2" : ""
              }`}
            >
              {tier.featured && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-cyan-500 to-blue-500 py-1.5 text-center text-xs font-semibold text-white">
                  Most Popular
                </div>
              )}
              <div className={`flex flex-col h-full ${tier.featured ? "pt-10" : "pt-6"} p-6`}>
                <div>
                  <h3 className="text-2xl font-bold text-cyan-700">{tier.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-slate-900">{tier.price}</span>
                    {tier.pricePeriod && (
                      <span className="text-slate-500 text-lg">{tier.pricePeriod}</span>
                    )}
                  </div>
                  {tier.priceSubtext && (
                    <p className="text-sm text-slate-500 mt-1">{tier.priceSubtext}</p>
                  )}
                  <p className="text-slate-600 mt-3">{tier.description}</p>
                </div>
                <ul className="space-y-3 mt-6 flex-1">
                  {tier.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </span>
                      <span className="text-slate-700">{benefit}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier.link}
                  className={`block text-center font-semibold py-3 rounded-xl transition-all mt-6 ${
                    tier.featured
                      ? "bg-cyan-600 text-white hover:bg-cyan-500"
                      : "bg-slate-100 text-cyan-700 hover:bg-slate-200"
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            </Card>
          ))}
        </div>

        {/* Comparison table toggle */}
        <div className="text-center">
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="inline-flex items-center gap-2 text-sm font-medium text-cyan-600 hover:text-cyan-700 transition-colors"
          >
            Compare all features
            <svg
              className={`w-4 h-4 transition-transform ${showComparison ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {showComparison && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[500px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Feature</th>
                    <th className="py-3 px-4 font-semibold text-cyan-700">Community</th>
                    <th className="py-3 px-4 font-semibold text-blue-700">Club</th>
                    <th className="py-3 px-4 font-semibold text-purple-700">Academy</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((feature, idx) => (
                    <tr
                      key={feature.label}
                      className={idx % 2 === 0 ? "bg-slate-50/50" : "bg-white"}
                    >
                      <td className="text-left py-2.5 px-4 text-slate-700">{feature.label}</td>
                      {(["community", "club", "academy"] as const).map((tier) => (
                        <td key={tier} className="py-2.5 px-4 text-center">
                          {feature[tier] ? (
                            <span className="text-cyan-600">✓</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ─── 8b. UPCOMING SESSIONS (inline callout) ──────────────────── */}
      <section className="flex justify-center">
        <Link
          href="/sessions-and-events"
          className="group inline-flex items-center gap-3 bg-cyan-50 border border-cyan-100 rounded-2xl px-6 py-4 hover:bg-cyan-100/70 transition-colors"
        >
          <span className="text-2xl">📅</span>
          <span className="text-slate-700">
            Sessions every Saturday —{" "}
            <span className="text-cyan-600 font-semibold group-hover:text-cyan-700 transition-colors">
              check the calendar →
            </span>
          </span>
        </Link>
      </section>

      {/* ─── 9. EARN BUBBLES ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50 via-cyan-50 to-emerald-50 px-6 py-16 md:px-12 md:py-20">
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 md:text-4xl mb-3">
            Earn Bubbles Every Time You Swim
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-4">
            Bubbles are our reward currency. Earn them by being active, then spend them on sessions,
            events, and gear.
          </p>

          {/* Concrete exchange rate examples */}
          <div className="inline-flex flex-wrap justify-center gap-3 mb-10 text-sm">
            <span className="bg-white/80 rounded-full px-4 py-1.5 text-slate-700">
              👥 Refer a friend = <strong>15 Bubbles</strong>
            </span>
            <span className="bg-white/80 rounded-full px-4 py-1.5 text-slate-700">
              🎓 Graduate Academy = <strong>20 Bubbles</strong>
            </span>
            <span className="bg-white/80 rounded-full px-4 py-1.5 text-slate-700">
              🤝 Volunteer = <strong>10 Bubbles</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 bg-white/80 backdrop-blur-sm text-center hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-2">🏊</div>
              <p className="font-semibold text-slate-900 mb-1">Attend Sessions</p>
              <p className="text-sm text-slate-600">
                Earn Bubbles for every swim session you attend
              </p>
            </Card>
            <Card className="p-5 bg-white/80 backdrop-blur-sm text-center hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-2">👥</div>
              <p className="font-semibold text-slate-900 mb-1">Refer Friends</p>
              <p className="text-sm text-slate-600">
                Get rewarded when your friends join SwimBuddz
              </p>
            </Card>
            <Card className="p-5 bg-white/80 backdrop-blur-sm text-center hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-2">🎓</div>
              <p className="font-semibold text-slate-900 mb-1">Graduate Academy</p>
              <p className="text-sm text-slate-600">
                Complete academy programs to earn bonus Bubbles
              </p>
            </Card>
            <Card className="p-5 bg-white/80 backdrop-blur-sm text-center hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-2">🤝</div>
              <p className="font-semibold text-slate-900 mb-1">Volunteer</p>
              <p className="text-sm text-slate-600">Help the community and get rewarded for it</p>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── 10. FINAL CTA ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-16 text-center text-white shadow-2xl md:px-12 md:py-20">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 text-cyan-500/20">
            <WaveDecoration flip />
          </div>
          <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute top-1/2 right-1/4 translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
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
          <div className="pt-4">
            <Link
              href="/register"
              className="group relative inline-flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-cyan-600 px-8 py-4 text-lg font-semibold text-white transition-all hover:scale-105 hover:shadow-xl hover:shadow-cyan-500/25"
            >
              <span className="relative z-10">Join SwimBuddz</span>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
