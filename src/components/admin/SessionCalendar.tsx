"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { type EventInput, type DateSelectArg, type EventClickArg } from "@fullcalendar/core";

interface SessionCalendarProps {
    events: EventInput[];
    onDateSelect: (selectInfo: DateSelectArg) => void;
    onEventClick: (clickInfo: EventClickArg) => void;
    onEventDrop?: (info: any) => void;
}

export function SessionCalendar({ events, onDateSelect, onEventClick, onEventDrop }: SessionCalendarProps) {
    return (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
            <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,timeGridWeek,timeGridDay"
                }}
                events={events}
                editable={true}
                selectable={true}
                selectMirror={true}
                dayMaxEvents={true}
                weekends={true}
                select={onDateSelect}
                eventClick={onEventClick}
                eventDrop={onEventDrop}
                eventContent={(eventInfo) => {
                    const sessionType = eventInfo.event.extendedProps.session_type || "Club";
                    const isRecurring = eventInfo.event.extendedProps.is_recurring_instance;

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
                    const baseClasses = "cursor-pointer transition-opacity hover:opacity-80";

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
      `}</style>
        </div>
    );
}
