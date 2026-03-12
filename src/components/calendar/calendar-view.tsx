"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, DatesSetArg } from "@fullcalendar/core";
import { ChevronLeft, ChevronRight, X, MapPin, Clock, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CalendarEvent, CalendarEventSource, FreeSlot } from "@/lib/edu-schedule/types";

/* ── Source color scheme ─────────────────────────────────── */

const SOURCE_STYLE: Record<
  CalendarEventSource,
  { bg: string; border: string; text: string; label: string; dot: string; badgeVariant: "sky" | "amber" | "violet" | "default" }
> = {
  TIMETABLE: { bg: "#dbeafe", border: "#0ea5e9", text: "#0c4a6e", label: "Timetable", dot: "bg-sky-500", badgeVariant: "sky" },
  EMAIL:     { bg: "#fef3c7", border: "#f59e0b", text: "#78350f", label: "Email-derived", dot: "bg-amber-500", badgeVariant: "amber" },
  MANUAL:    { bg: "#ede9fe", border: "#8b5cf6", text: "#4c1d95", label: "Manual", dot: "bg-violet-500", badgeVariant: "violet" },
  SYSTEM:    { bg: "#f1f5f9", border: "#64748b", text: "#334155", label: "System", dot: "bg-slate-500", badgeVariant: "default" },
};

type ViewType = "timeGridWeek" | "timeGridDay" | "dayGridMonth" | "listWeek";

const VIEWS: { key: ViewType; label: string }[] = [
  { key: "timeGridDay", label: "Day" },
  { key: "timeGridWeek", label: "Week" },
  { key: "dayGridMonth", label: "Month" },
  { key: "listWeek", label: "List" },
];

/* ── Main component ──────────────────────────────────────── */

type Props = {
  events: CalendarEvent[];
  freeSlots: FreeSlot[];
};

export function CalendarView({ events, freeSlots }: Props) {
  const calRef = useRef<FullCalendar>(null);
  const [title, setTitle] = useState("");
  const [activeView, setActiveView] = useState<ViewType>("timeGridWeek");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const api = () => calRef.current?.getApi();

  const handleToday = () => api()?.today();
  const handlePrev = () => api()?.prev();
  const handleNext = () => api()?.next();
  const handleViewChange = (view: ViewType) => {
    api()?.changeView(view);
    setActiveView(view);
  };

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    setTitle(arg.view.title);
    setActiveView(arg.view.type as ViewType);
  }, []);

  const handleEventClick = useCallback(
    (arg: EventClickArg) => {
      const props = arg.event.extendedProps;
      const match = events.find((e) => e.id === arg.event.id);
      if (match) setSelectedEvent(match);
      else {
        setSelectedEvent({
          id: arg.event.id,
          title: arg.event.title,
          startsAt: arg.event.startStr,
          endsAt: arg.event.endStr,
          location: props.location,
          source: props.source ?? "SYSTEM",
          description: props.description,
          tags: props.tags ?? [],
        });
      }
    },
    [events],
  );

  const fcEvents = events.map((event) => {
    const style = SOURCE_STYLE[event.source] ?? SOURCE_STYLE.SYSTEM;
    return {
      id: event.id,
      title: event.title,
      start: event.startsAt,
      end: event.endsAt,
      backgroundColor: style.bg,
      borderColor: style.border,
      textColor: style.text,
      extendedProps: {
        location: event.location,
        source: event.source,
        description: event.description,
        tags: event.tags,
      },
    };
  });

  const activeSources = [...new Set(events.map((e) => e.source))];

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: nav controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToday}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Today
          </button>
          <div className="flex items-center">
            <button
              onClick={handlePrev}
              className="rounded-l-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50 transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleNext}
              className="rounded-r-lg border border-l-0 border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50 transition-colors"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <h2 className="ml-1 text-lg font-semibold text-slate-900" aria-live="polite">
            {title}
          </h2>
        </div>

        {/* Right: view switcher */}
        <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white">
          {VIEWS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleViewChange(key)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                activeView === key
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Source legend */}
      <div className="flex flex-wrap items-center gap-4">
        {activeSources.map((source) => {
          const s = SOURCE_STYLE[source];
          return (
            <div key={source} className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className={cn("h-2.5 w-2.5 rounded-full", s.dot)} />
              {s.label}
            </div>
          );
        })}
        {freeSlots.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            {freeSlots.length} free slot{freeSlots.length !== 1 ? "s" : ""} (45+ min)
          </div>
        )}
      </div>

      {/* Calendar */}
      <div className="edu-calendar rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {mounted ? (
          <FullCalendar
            ref={calRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={false}
            events={fcEvents}
            datesSet={handleDatesSet}
            eventClick={handleEventClick}
            height="auto"
            weekends={true}
            nowIndicator={true}
            slotMinTime="07:00:00"
            slotMaxTime="22:00:00"
            slotDuration="00:30:00"
            allDaySlot={false}
            dayHeaderFormat={{ weekday: "short", day: "numeric" }}
            slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
            eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
            firstDay={1}
            expandRows={true}
            stickyHeaderDates={true}
          />
        ) : (
          <div className="flex h-96 items-center justify-center">
            <p className="text-sm text-slate-400">Loading calendar...</p>
          </div>
        )}
      </div>

      {/* Free slots panel */}
      {freeSlots.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Free study slots</h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Gaps of 45+ minutes detected in your upcoming schedule.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {freeSlots.map((slot) => (
              <div
                key={`${slot.startsAt}-${slot.endsAt}`}
                className="rounded-lg border-l-4 border-l-emerald-400 border border-emerald-100 bg-emerald-50/60 px-3 py-2"
              >
                <p className="text-sm font-medium text-emerald-900">
                  {formatTime(slot.startsAt)} – {formatTime(slot.endsAt)}
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">{slot.durationMinutes} min</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event detail modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}

/* ── Event detail modal ──────────────────────────────────── */

function EventDetailModal({
  event,
  onClose,
}: {
  event: CalendarEvent;
  onClose: () => void;
}) {
  const style = SOURCE_STYLE[event.source] ?? SOURCE_STYLE.SYSTEM;

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Event: ${event.title}`}
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with source color bar */}
        <div
          className="rounded-t-xl px-5 py-4"
          style={{ backgroundColor: style.bg, borderBottom: `3px solid ${style.border}` }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold leading-snug" style={{ color: style.text }}>
                {event.title}
              </h3>
              <Badge variant={style.badgeVariant} className="mt-2">
                {style.label}
              </Badge>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-white/60 hover:text-slate-600 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Clock className="h-4 w-4 text-slate-400 shrink-0" />
            <time>
              {formatDateTime(event.startsAt)} – {formatTime(event.endsAt)}
            </time>
          </div>

          {event.location && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
              {event.location}
            </div>
          )}

          {event.description && (
            <p className="text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
              {event.description}
            </p>
          )}

          {event.tags.length > 0 && (
            <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
              <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
              <div className="flex flex-wrap gap-1">
                {event.tags.map((tag) => (
                  <Badge key={tag} variant="default">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────── */

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
