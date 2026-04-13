import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfDay,
  startOfWeek,
} from "date-fns";
import {
  AlertTriangle,
  BellRing,
  CalendarDays,
  Clock3,
  GraduationCap,
  MapPin,
  Plus,
  Trash2,
} from "lucide-react";
import { eventsAPI, interactionsAPI } from "@/lib/api";
import { useAcademicTimetable } from "@/hooks/use-academic-timetable.ts";
import { Calendar } from "@/components/ui/calendar.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { useAuth } from "@/hooks/use-auth.ts";
import { toMinutes } from "@/lib/planner.ts";
import { toast } from "sonner";

type SavedCalendarItem = {
  _id: string;
  eventId: {
    _id: string;
    title: string;
    venue?: string;
    dateTime: string;
    endDateTime?: string;
    organizationId?: { name?: string } | string;
  } | null;
};

type SavedEvent = {
  _id: string;
  title: string;
  venue?: string;
  dateTime: string;
  endDateTime?: string;
  organizationId?: { name?: string } | string;
};

type VisibleCalendarEvent = {
  _id: string;
  title: string;
  venue?: string;
  dateTime: string;
  endDateTime?: string;
  organizationId?: { name?: string } | string;
};

function isSavedEvent(event: SavedEvent | null): event is SavedEvent {
  return event !== null;
}

type TimetableSlot = {
  id: string;
  title: string;
  day: number;
  startTime: string;
  endTime: string;
  location?: string;
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getWeekdayIndex(date: Date) {
  return (date.getDay() + 6) % 7;
}

function overlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
}

export default function PersonalCalendarCard() {
  const { isAuthenticated } = useAuth();
  const currentYear = new Date().getFullYear();
  const [events, setEvents] = useState<SavedEvent[]>([]);
  const [visibleEvents, setVisibleEvents] = useState<VisibleCalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [monthCursor, setMonthCursor] = useState(new Date());
  const [searchText, setSearchText] = useState("");
  const [upcomingOnly, setUpcomingOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"month" | "week">("month");
  const { slots, setSlots } = useAcademicTimetable();
  const [slotTitle, setSlotTitle] = useState("");
  const [slotDay, setSlotDay] = useState("0");
  const [slotStart, setSlotStart] = useState("09:00");
  const [slotEnd, setSlotEnd] = useState("10:00");

  useEffect(() => {
    const fetchSavedEvents = async (showError = true) => {
      if (!isAuthenticated) {
        setEvents([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await interactionsAPI.getCalendarSaves();
        const normalized = (Array.isArray(data) ? data : [])
          .map((item: SavedCalendarItem): SavedEvent | null => {
            const event = item?.eventId;
            if (!event?._id || !event?.dateTime) return null;
            return {
              _id: String(event._id),
              title: event.title || "Untitled Event",
              venue: event.venue,
              dateTime: event.dateTime,
              endDateTime: event.endDateTime,
              organizationId: event.organizationId,
            };
          })
          .filter(isSavedEvent);

        const deduped = Array.from(new Map(normalized.map((event) => [event._id, event])).values())
          .filter((event) => event?.dateTime)
          .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

        setEvents(deduped);
      } catch (error) {
        console.error("Failed to load saved calendar events:", error);
        if (showError) toast.error("Failed to load saved calendar events");
      } finally {
        setLoading(false);
      }
    };

    fetchSavedEvents();

    const handleCalendarSaveUpdate = () => {
      fetchSavedEvents(false);
    };

    window.addEventListener("calendar-save-updated", handleCalendarSaveUpdate);
    return () => window.removeEventListener("calendar-save-updated", handleCalendarSaveUpdate);
  }, [isAuthenticated]);

  useEffect(() => {
    let cancelled = false;

    const fetchVisibleEvents = async () => {
      try {
        const rangeStart = startOfWeek(startOfMonth(monthCursor));
        const rangeEnd = endOfWeek(endOfMonth(monthCursor));
        const rangeEvents = await eventsAPI.getCalendarRange(
          format(rangeStart, "yyyy-MM-dd"),
          format(rangeEnd, "yyyy-MM-dd"),
        );

        const deduped = Array.from(
          new Map(
            (Array.isArray(rangeEvents) ? rangeEvents : [])
              .filter((event: any) => event?._id && event?.dateTime)
              .map((event: any) => [String(event._id), event]),
          ).values(),
        );

        if (!cancelled) {
          setVisibleEvents(deduped);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch visible planner events:", error);
        }
      }
    };

    fetchVisibleEvents();

    return () => {
      cancelled = true;
    };
  }, [monthCursor]);

  const scopedEvents = useMemo(() => {
    const now = new Date();
    if (!upcomingOnly) return events;
    return events.filter((event) => isAfter(new Date(event.dateTime), now));
  }, [events, upcomingOnly]);

  const scopedVisibleEvents = useMemo(() => {
    const monthEvents = visibleEvents.filter((event) => {
      if (!event?.dateTime) return false;
      return isSameMonth(new Date(event.dateTime), monthCursor);
    });
    return monthEvents;
  }, [visibleEvents, upcomingOnly, monthCursor]);

  const eventDates = useMemo(
    () => scopedEvents.map((event) => startOfDay(new Date(event.dateTime))),
    [scopedEvents],
  );

  const visibleEventDates = useMemo(
    () =>
      Array.from(
        new Set(
          scopedVisibleEvents
            .map((event) => event?.dateTime)
            .filter(Boolean)
            .map((dateTime) => format(new Date(dateTime as string), "yyyy-MM-dd")),
        ),
      ).map((key) => startOfDay(new Date(key))),
    [scopedVisibleEvents],
  );

  const busyDates = useMemo(() => {
    const counts = new Map<string, number>();
    scopedEvents.forEach((event) => {
      const key = format(new Date(event.dateTime), "yyyy-MM-dd");
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries())
      .filter(([, count]) => count >= 3)
      .map(([key]) => startOfDay(new Date(key)));
  }, [scopedEvents]);

  const selectedDateAllEvents = useMemo(() => {
    if (!selectedDate) return [];
    return scopedEvents
      .filter((event) => isSameDay(new Date(event.dateTime), selectedDate))
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  }, [scopedEvents, selectedDate]);

  const selectedDateVisibleEvents = useMemo(() => {
    if (!selectedDate) return [];
    return scopedVisibleEvents
      .filter((event) => event?.dateTime && isSameDay(new Date(event.dateTime), selectedDate))
      .sort((a, b) => new Date(a.dateTime as string).getTime() - new Date(b.dateTime as string).getTime());
  }, [scopedVisibleEvents, selectedDate]);

  const selectedDateEvents = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const visibleById = new Map(selectedDateVisibleEvents.map((event) => [String(event._id), event]));
    const mergedEvents = [
      ...selectedDateVisibleEvents,
      ...selectedDateAllEvents.filter((event) => !visibleById.has(String(event._id))),
    ];
    if (!query) return mergedEvents;
    return mergedEvents.filter((event) => (event.title || "").toLowerCase().includes(query));
  }, [selectedDateAllEvents, selectedDateVisibleEvents, searchText]);

  const next48HoursCount = useMemo(() => {
    const now = new Date();
    const twoDaysAhead = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    return scopedEvents.filter((event) => {
      const eventTime = new Date(event.dateTime).getTime();
      return eventTime >= now.getTime() && eventTime <= twoDaysAhead.getTime();
    }).length;
  }, [scopedEvents]);

  const weekStart = useMemo(
    () => startOfWeek(selectedDate || new Date(), { weekStartsOn: 1 }),
    [selectedDate],
  );

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );

  const clashes = useMemo(() => {
    return scopedEvents.filter((event) => {
      const date = new Date(event.dateTime);
      const day = getWeekdayIndex(date);
      const start = date.getHours() * 60 + date.getMinutes();
      const endDate = event.endDateTime ? new Date(event.endDateTime) : new Date(date.getTime() + 60 * 60 * 1000);
      const end = endDate.getHours() * 60 + endDate.getMinutes();
      return slots.some((slot) => slot.day === day && overlaps(start, end, toMinutes(slot.startTime), toMinutes(slot.endTime)));
    });
  }, [scopedEvents, slots]);

  const selectedWeekdayIndex = useMemo(
    () => getWeekdayIndex(selectedDate || new Date()),
    [selectedDate],
  );

  const selectedDaySlots = useMemo(
    () => slots.filter((slot) => slot.day === selectedWeekdayIndex),
    [selectedWeekdayIndex, slots],
  );

  const selectedDayClashes = useMemo(() => {
    return selectedDateAllEvents.filter((event) => {
      const eventStart = new Date(event.dateTime);
      const eventEnd = event.endDateTime ? new Date(event.endDateTime) : new Date(eventStart.getTime() + 60 * 60 * 1000);
      return selectedDaySlots.some((slot) =>
        overlaps(
          eventStart.getHours() * 60 + eventStart.getMinutes(),
          eventEnd.getHours() * 60 + eventEnd.getMinutes(),
          toMinutes(slot.startTime),
          toMinutes(slot.endTime),
        ),
      );
    });
  }, [selectedDateAllEvents, selectedDaySlots]);

  const getOrganizationName = (event: SavedEvent) => {
    if (!event.organizationId) return "IIT Kanpur";
    if (typeof event.organizationId === "string") return "IIT Kanpur";
    return event.organizationId.name || "IIT Kanpur";
  };

  const isSavedEventId = (eventId?: string) => events.some((event) => event._id === eventId);

  const getVisibleOrganizationName = (event: VisibleCalendarEvent) => {
    if (!event.organizationId) return "IIT Kanpur";
    if (typeof event.organizationId === "string") return "IIT Kanpur";
    return event.organizationId.name || "IIT Kanpur";
  };

  const addSlot = () => {
    if (!isAuthenticated) return toast.error("Sign in to manage your academic planner");
    if (!slotTitle.trim()) return toast.error("Add a class title");
    if (toMinutes(slotEnd) <= toMinutes(slotStart)) return toast.error("End time must be after start time");
    setSlots((current) => [
      ...current,
      {
        id: `${Date.now()}`,
        title: slotTitle.trim(),
        day: Number(slotDay),
        startTime: slotStart,
        endTime: slotEnd,
      },
    ]);
    setSlotTitle("");
  };

  return (
    <Card className="overflow-hidden border-border/60 bg-[linear-gradient(180deg,rgba(255,248,235,0.86),rgba(255,255,255,0.98))] shadow-[0_16px_40px_rgba(15,23,42,0.06)] dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.94),rgba(15,23,42,0.98))] dark:shadow-[0_16px_40px_rgba(2,6,23,0.32)]">
      <div className="border-b border-border/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <CalendarDays className="h-4 w-4 text-primary" />
              Academic Planner
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Saved events plus weekly timetable
            </p>
          </div>
          {next48HoursCount > 0 && (
            <Badge variant="secondary" className="gap-1 rounded-full">
              <BellRing className="h-3 w-3" />
              {next48HoursCount} soon
            </Badge>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Button type="button" variant={view === "month" ? "default" : "outline"} size="sm" onClick={() => setView("month")}>
            Month
          </Button>
          <Button type="button" variant={view === "week" ? "default" : "outline"} size="sm" onClick={() => setView("week")}>
            Week
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
            Today
          </Button>
          <Button type="button" variant={upcomingOnly ? "default" : "outline"} size="sm" onClick={() => setUpcomingOnly((prev) => !prev)}>
            {upcomingOnly ? "Upcoming" : "All"}
          </Button>
        </div>
      </div>

      {view === "month" ? (
        <>
          <div className="p-3">
            {loading ? (
              <div className="space-y-2 p-2">
                <Skeleton className="h-56 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ) : (
              <Calendar
                mode="single"
                captionLayout="dropdown"
                fromYear={currentYear - 3}
                toYear={currentYear + 5}
                month={monthCursor}
                onMonthChange={setMonthCursor}
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setSearchText("");
                }}
                className="w-full rounded-[1.25rem] border border-border/50 bg-background/70 p-3"
                classNames={{ today: "bg-transparent text-inherit rounded-none" }}
                modifiers={{ hasEvents: eventDates, visibleEvents: visibleEventDates, busyDay: busyDates }}
                modifiersClassNames={{ busyDay: "ring-1 ring-primary/50 rounded-md" }}
                components={{
                  DayButton: ({ day, className: _className, ...props }) => {
                    const date = startOfDay(day.date);
                    const hasSavedEvents = eventDates.some((eventDate) => isSameDay(eventDate, date));
                    const hasVisibleEvents = visibleEventDates.some((eventDate) => isSameDay(eventDate, date));
                    const isSelected = !!selectedDate && isSameDay(date, selectedDate);
                    const isToday = isSameDay(date, new Date());
                    const isCurrentMonth = isSameMonth(date, monthCursor);

                    return (
                      <button
                        {...props}
                        type="button"
                        className={`relative flex h-10 w-10 items-center justify-center rounded-md border text-sm transition ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground shadow-none"
                            : isToday
                              ? "border-orange-500 bg-orange-500 text-white shadow-none"
                            : hasSavedEvents
                              ? "border-primary/60 bg-primary/[0.05] text-foreground"
                              : isCurrentMonth
                                ? "border-transparent text-foreground hover:border-primary/25 hover:bg-primary/[0.04]"
                                : "border-transparent text-muted-foreground/65"
                        }`}
                      >
                        <span>{format(date, "d")}</span>
                        {hasVisibleEvents && (
                          <span
                            className={`absolute bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
                              isSelected || isToday ? "bg-white" : "bg-primary"
                            }`}
                          />
                        )}
                      </button>
                    );
                  },
                }}
              />
            )}
          </div>

          <div className="border-t border-border/60 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {selectedDate ? format(selectedDate, "EEE, MMM d") : "Select a date"}
              </p>
              <Badge variant="outline" className="text-xs">
                {selectedDateEvents.length} event{selectedDateEvents.length === 1 ? "" : "s"}
              </Badge>
            </div>
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search events on this day..."
              className="mb-3 h-9 text-xs"
            />
            <div className="max-h-56 space-y-2 overflow-auto pr-1 no-scrollbar">
              {selectedDateEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No events for this day.
                </p>
              ) : (
                selectedDateEvents.map((event) => (
                  <div key={event._id} className={`rounded-xl border px-3 py-2 ${isSavedEventId(event._id) ? "border-primary/40 bg-primary/[0.05]" : "border-border/50 bg-background/70"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-tight">{event.title}</p>
                      {isSavedEventId(event._id) && (
                        <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/[0.08] text-[10px] text-primary">
                          Saved
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                      <p className="flex items-center gap-1.5">
                        <Clock3 className="h-3 w-3" />
                        {event.dateTime ? format(new Date(event.dateTime), "h:mm a") : "Time TBA"}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" />
                        {(event.venue || "Venue TBA")} | {"organizationId" in event && !("saveId" in event) ? getVisibleOrganizationName(event as VisibleCalendarEvent) : getOrganizationName(event as SavedEvent)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-4 p-4">
          <div className="rounded-[1.25rem] border border-border/50 bg-background/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Add Timetable Slot
            </p>
            <div className="mt-3 space-y-2">
              <Input value={slotTitle} onChange={(e) => setSlotTitle(e.target.value)} placeholder="Course / lab" className="h-9 text-xs" />
              <div className="grid grid-cols-3 gap-2">
                <select value={slotDay} onChange={(e) => setSlotDay(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-xs">
                  {WEEKDAY_LABELS.map((label, index) => (
                    <option key={label} value={index}>{label}</option>
                  ))}
                </select>
                <Input type="time" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} className="h-9 text-xs" />
                <Input type="time" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} className="h-9 text-xs" />
              </div>
              <Button size="sm" className="w-full" onClick={addSlot} disabled={!isAuthenticated}>
                <Plus className="mr-2 h-4 w-4" />
                {isAuthenticated ? "Add Slot" : "Sign in to add"}
              </Button>
            </div>
          </div>

          <div className="rounded-[1.25rem] border border-border/50 bg-background/70 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Weekly View
              </p>
              <Badge variant="outline" className="text-[10px]">
                {clashes.length} clashes
              </Badge>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {weekDays.map((date, index) => {
                const daySlots = slots.filter((slot) => slot.day === index);
                const dayEvents = scopedEvents.filter((event) => isSameDay(new Date(event.dateTime), date));
                const isSelected = !!selectedDate && isSameDay(date, selectedDate);

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setSelectedDate(date);
                      setSearchText("");
                    }}
                    className={`rounded-2xl border p-2 text-left transition ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(99,102,241,0.2)]"
                        : "border-border/60 bg-muted/20 hover:border-primary/30 hover:bg-primary/5"
                    }`}
                  >
                    <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {WEEKDAY_LABELS[index]}
                    </p>
                    <p className="mt-2 text-lg font-semibold">{format(date, "d")}</p>
                    <p className={`mt-2 text-[10px] ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {daySlots.length} class{daySlots.length === 1 ? "" : "es"}
                    </p>
                    <p className={`text-[10px] ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {dayEvents.length} event{dayEvents.length === 1 ? "" : "s"}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 rounded-xl border border-border/50 bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-foreground">
                  {selectedDate ? format(selectedDate, "EEE, MMM d") : "Selected day"}
                </p>
                <Badge variant="outline" className="text-[10px]">
                  {selectedDayClashes.length} clashes
                </Badge>
              </div>

              <div className="mt-3 space-y-1.5">
                {selectedDaySlots.map((slot) => (
                  <div key={slot.id} className="flex items-center justify-between rounded-lg bg-sky-100 px-2 py-1 text-xs text-sky-950 dark:bg-sky-400/12 dark:text-sky-100">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-3 w-3" />
                      <span>{slot.title} · {slot.startTime}-{slot.endTime}</span>
                    </div>
                    <button type="button" onClick={() => setSlots((current) => current.filter((item) => item.id !== slot.id))}>
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}

                {selectedDateEvents.map((event) => {
                  const eventStart = new Date(event.dateTime);
                  const eventEnd = event.endDateTime ? new Date(event.endDateTime) : new Date(eventStart.getTime() + 60 * 60 * 1000);
                  const hasClash = selectedDaySlots.some((slot) =>
                    overlaps(
                      eventStart.getHours() * 60 + eventStart.getMinutes(),
                      eventEnd.getHours() * 60 + eventEnd.getMinutes(),
                      toMinutes(slot.startTime),
                      toMinutes(slot.endTime),
                    ),
                  );

                  return (
                    <div key={event._id} className={`rounded-lg px-2 py-1 text-xs ${hasClash ? "bg-amber-100 text-amber-950 dark:bg-amber-400/12 dark:text-amber-100" : "bg-orange-100 text-orange-950 dark:bg-orange-400/12 dark:text-orange-100"}`}>
                      <div className="flex items-center gap-2">
                        {hasClash && <AlertTriangle className="h-3 w-3" />}
                        <span>{event.title} · {format(eventStart, "h:mm a")}</span>
                      </div>
                    </div>
                  );
                })}

                {selectedDaySlots.length === 0 && selectedDateEvents.length === 0 && (
                  <p className="text-xs text-muted-foreground">Free day</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
