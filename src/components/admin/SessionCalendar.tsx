"use client";

import {
  type DateSelectArg,
  type EventClickArg,
  type EventInput,
} from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useEffect, useState } from "react";

interface SessionCalendarProps {
  events: EventInput[];
  onDateSelect: (selectInfo: DateSelectArg) => void;
  onEventClick: (clickInfo: EventClickArg) => void;
  onEventDrop?: (info: any) => void;
}

export function SessionCalendar({
  events,
  onDateSelect,
  onEventClick,
  onEventDrop,
}: SessionCalendarProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2 sm:p-4">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={isMobile ? "timeGridDay" : "dayGridMonth"}
        headerToolbar={
          isMobile
            ? {
                left: "prev,next",
                center: "title",
                right: "today",
              }
            : {
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
              }
        }
        events={events}
        editable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={isMobile ? 2 : true}
        weekends={true}
        select={onDateSelect}
        eventClick={onEventClick}
        eventDrop={onEventDrop}
        eventContent={(eventInfo) => {
          const sessionType =
            eventInfo.event.extendedProps.session_type || "Club";
          const isRecurring =
            eventInfo.event.extendedProps.is_recurring_instance;

          return (
            <div className="px-1 py-0.5 text-xs">
              {isRecurring && <span className="mr-1">🔁</span>}
              <strong>{eventInfo.timeText}</strong>
              <div>{eventInfo.event.title}</div>
            </div>
          );
        }}
        height="auto"
        eventClassNames={(arg) => {
          const sessionType = arg.event.extendedProps.session_type || "Club";
          const baseClasses =
            "cursor-pointer transition-opacity hover:opacity-80";

          switch (sessionType) {
            case "Club":
              return `${baseClasses} !bg-cyan-600 !border-cyan-700`;
            case "Meetup":
              return `${baseClasses} !bg-purple-600 !border-purple-700`;
            case "Academy":
              return `${baseClasses} !bg-orange-600 !border-orange-700`;
            default:
              return `${baseClasses} !bg-slate-600 !border-slate-700`;
          }
        }}
      />

      <style jsx global>{`
        .fc {
          font-family: inherit;
        }
        .fc-button {
          background-color: #0891b2 !important;
          border-color: #0891b2 !important;
          padding: 0.5rem 0.75rem !important;
          min-height: 44px !important;
          font-size: 0.875rem !important;
        }
        .fc-button:hover {
          background-color: #0e7490 !important;
        }
        .fc-button-active {
          background-color: #0e7490 !important;
        }
        .fc-daygrid-day-number {
          color: #1e293b;
        }
        .fc-col-header-cell-cushion {
          color: #475569;
          font-weight: 600;
        }
        /* Mobile optimizations */
        @media (max-width: 640px) {
          .fc-toolbar {
            flex-direction: column;
            gap: 0.5rem;
          }
          .fc-toolbar-chunk {
            display: flex;
            justify-content: center;
          }
          .fc-toolbar-title {
            font-size: 1rem !important;
          }
          .fc-button {
            padding: 0.375rem 0.5rem !important;
            font-size: 0.75rem !important;
          }
          .fc-daygrid-day-number {
            font-size: 0.875rem;
            padding: 4px !important;
          }
        }
      `}</style>
    </div>
  );
}
