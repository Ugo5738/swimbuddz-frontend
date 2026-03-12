"use client";

import { type DateSelectArg, type EventClickArg, type EventInput } from "@fullcalendar/core";
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
          const isRecurring = eventInfo.event.extendedProps.is_recurring_instance;
          const isDraft = eventInfo.event.extendedProps.status === "draft";
          const isCancelled = eventInfo.event.extendedProps.status === "cancelled";

          return (
            <div className="px-1 py-0.5 text-xs">
              <div className="flex items-center gap-1">
                {isRecurring && <span>🔁</span>}
                {isDraft && (
                  <span className="rounded bg-white/30 px-1 text-[10px] font-bold uppercase leading-tight">
                    Draft
                  </span>
                )}
                {isCancelled && (
                  <span className="rounded bg-red-900/40 px-1 text-[10px] font-bold uppercase leading-tight">
                    Cancelled
                  </span>
                )}
                <strong>{eventInfo.timeText}</strong>
              </div>
              <div className={isCancelled ? "line-through" : ""}>{eventInfo.event.title}</div>
            </div>
          );
        }}
        height="auto"
        eventClassNames={(arg) => {
          const sessionType = arg.event.extendedProps.session_type || "club";
          const sessionStatus = arg.event.extendedProps.status;
          const baseClasses = "cursor-pointer transition-opacity hover:opacity-80";
          const draftClasses =
            sessionStatus === "draft" ? "!opacity-60 !border-dashed !border-2" : "";
          const cancelledClasses = sessionStatus === "cancelled" ? "!opacity-40 !line-through" : "";

          let typeClasses: string;
          switch (sessionType) {
            case "club":
              typeClasses = "!bg-cyan-600 !border-cyan-700";
              break;
            case "community":
              typeClasses = "!bg-purple-600 !border-purple-700";
              break;
            case "cohort_class":
              typeClasses = "!bg-orange-600 !border-orange-700";
              break;
            case "one_on_one":
              typeClasses = "!bg-emerald-600 !border-emerald-700";
              break;
            case "group_booking":
              typeClasses = "!bg-blue-600 !border-blue-700";
              break;
            case "event":
              typeClasses = "!bg-rose-600 !border-rose-700";
              break;
            default:
              typeClasses = "!bg-slate-600 !border-slate-700";
              break;
          }

          return `${baseClasses} ${typeClasses} ${draftClasses} ${cancelledClasses}`;
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
