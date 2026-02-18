"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Calendar, MapPin, Users, Filter } from "lucide-react";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import Link from "next/link";
import { format } from "date-fns";
import { apiEndpoints } from "@/lib/config";

interface Event {
  id: string;
  title: string;
  description: string;
  event_type: string;
  location: string;
  start_time: string;
  end_time: string | null;
  max_capacity: number | null;
  tier_access: string;
  rsvp_count?: {
    going: number;
    maybe: number;
    not_going: number;
  };
}

const eventTypeLabels: Record<string, string> = {
  social: "Social",
  volunteer: "Volunteer",
  beach_day: "Beach Day",
  watch_party: "Watch Party",
  cleanup: "Beach Cleanup",
  training: "Training Session",
};

const eventTypeColors: Record<string, string> = {
  social: "bg-purple-100 text-purple-700",
  volunteer: "bg-emerald-100 text-emerald-700",
  beach_day: "bg-cyan-100 text-cyan-700",
  watch_party: "bg-orange-100 text-orange-700",
  cleanup: "bg-green-100 text-green-700",
  training: "bg-blue-100 text-blue-700",
};

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch(`${apiEndpoints.events}/`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents =
    filterType === "all"
      ? events
      : events.filter((event) => event.event_type === filterType);

  const upcomingEvents = filteredEvents.filter(
    (event) => new Date(event.start_time) > new Date(),
  );

  const eventTypes = Array.from(new Set(events.map((e) => e.event_type)));

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-4 md:py-8">
      {/* Header */}
      <header className="space-y-3">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
          Community Events
        </h1>
        <p className="text-sm md:text-base text-slate-600">
          Join us for social gatherings, beach days, volunteer activities, and
          more!
        </p>
      </header>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        <div className="flex items-center gap-2 text-xs md:text-sm font-medium text-slate-700">
          <Filter className="h-4 w-4" />
          <span>Filter:</span>
        </div>

        <button
          onClick={() => setFilterType("all")}
          className={`rounded-full px-3 md:px-4 py-1.5 text-xs md:text-sm font-medium transition-colors ${
            filterType === "all"
              ? "bg-cyan-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          All Events
        </button>

        {eventTypes.map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`rounded-full px-3 md:px-4 py-1.5 text-xs md:text-sm font-medium transition-colors ${
              filterType === type
                ? "bg-cyan-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {eventTypeLabels[type] || type}
          </button>
        ))}
      </div>

      {/* Events Grid */}
      {loading ? (
        <LoadingPage text="Loading events..." />
      ) : upcomingEvents.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-4 text-lg font-semibold text-slate-900">
            No upcoming events
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            {filterType === "all"
              ? "Check back soon for new events!"
              : "No events of this type scheduled. Try a different filter."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {upcomingEvents.map((event) => (
            <Link key={event.id} href={`/community/events/${event.id}`}>
              <Card className="group h-full transition-all hover:shadow-lg">
                <div className="space-y-4">
                  {/* Event Type Badge */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        eventTypeColors[event.event_type] ||
                        "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {eventTypeLabels[event.event_type] || event.event_type}
                    </span>
                    {event.tier_access !== "community" && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        {event.tier_access}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-semibold text-slate-900 group-hover:text-cyan-600">
                    {event.title}
                  </h3>

                  {/* Description */}
                  <p className="line-clamp-2 text-sm text-slate-600">
                    {event.description}
                  </p>

                  {/* Meta Info */}
                  <div className="space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span>
                        {format(
                          new Date(event.start_time),
                          "MMM d, yyyy • h:mm a",
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span>{event.location}</span>
                    </div>

                    {event.max_capacity && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-slate-400" />
                        <span>
                          {event.rsvp_count?.going || 0} / {event.max_capacity}{" "}
                          attending
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
