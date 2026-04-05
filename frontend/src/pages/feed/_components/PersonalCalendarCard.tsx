import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  format,
  isAfter,
  isSameDay,
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
import { eventsAPI } from "@/lib/api";
import { Calendar } from "@/components/ui/calendar.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { toast } from "sonner";

type CampusEvent = {
  _id: string;
  title: string;
  venue?: string;
  dateTime: string;
  endDateTime?: string;
  organizationId?: { name?: string } | string;
};

type TimetableSlot = {
  id: string;
  title: string;
  day: number;
  startTime: string;
  endTime: string;
};

const STORAGE_KEY = "loredrop-sidebar-timetable-v1";
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function getWeekdayIndex(date: Date) {
  return (date.getDay() + 6) % 7;
}

function overlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
}

export default function PersonalCalendarCard() {
  const currentYear = new Date().getFullYear();
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchText, setSearchText] = useState("");
  const [upcomingOnly, setUpcomingOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"month" | "week">("month");
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [slotTitle, setSlotTitle] = useState("");
  const [slotDay, setSlotDay] = useState("0");
  const [slotStart, setSlotStart] = useState("09:00");
  const [slotEnd, setSlotEnd] = useState("10:00");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) setSlots(parsed);
    } catch {
      console.error("Failed to parse saved timetable");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
  }, [slots]);

  useEffect(() => {
    const fetchCampusEvents = async () => {
      try {
        setLoading(true);
        const collected: CampusEvent[] = [];
        const maxPages = 5;
        let page = 1;
        let totalPages = 1;

        do {
          const data = await eventsAPI.getFeed(page, 50);
          const batch = Array.isArray(data?.data) ? data.data : [];
          collected.push(...batch);
          totalPages = Math.min(Number(data?.pages || 1), maxPages);
          page += 1;
        } while (page <= totalPages);

        const deduped = Array.from(new Map(collected.map((event) => [event._id, event])).values())
          .filter((event) => event?.dateTime)
          .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

        setEvents(deduped);
      } catch (error) {
        console.error("Failed to load campus calendar:", error);
        toast.error("Failed to load IITK events calendar");
      } finally {
        setLoading(false);
      }
    };

    fetchCampusEvents();
  }, []);

  const scopedEvents = useMemo(() => {
    const now = new Date();
    if (!upcomingOnly) return events;
    return events.filter((event) => isAfter(new Date(event.dateTime), now));
  }, [events, upcomingOnly]);

  const eventDates = useMemo(
    () => scopedEvents.map((event) => startOfDay(new Date(event.dateTime))),
    [scopedEvents],
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

  const selectedDateEvents = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return selectedDateAllEvents;
    return selectedDateAllEvents.filter((event) => event.title.toLowerCase().includes(query));
  }, [selectedDateAllEvents, searchText]);

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

  const getOrganizationName = (event: CampusEvent) => {
    if (!event.organizationId) return "IIT Kanpur";
    if (typeof event.organizationId === "string") return "IIT Kanpur";
    return event.organizationId.name || "IIT Kanpur";
  };

  const addSlot = () => {
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
    <Card className="overflow-hidden border-border/60 bg-[linear-gradient(180deg,rgba(255,248,235,0.86),rgba(255,255,255,0.98))] shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <div className="border-b border-border/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <CalendarDays className="h-4 w-4 text-primary" />
              Academic Planner
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Month view plus weekly timetable
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
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setSearchText("");
                }}
                className="w-full rounded-[1.25rem] border border-border/50 bg-background/70 p-3"
                modifiers={{ hasEvents: eventDates, busyDay: busyDates }}
                modifiersClassNames={{
                  hasEvents: "relative after:absolute after:bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary",
                  busyDay: "ring-1 ring-primary/50 rounded-md",
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
                {selectedDateAllEvents.length} events
              </Badge>
            </div>
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search selected date events..."
              className="mb-3 h-9 text-xs"
            />
            <div className="max-h-56 space-y-2 overflow-auto pr-1 no-scrollbar">
              {selectedDateEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No campus events for this day.
                </p>
              ) : (
                selectedDateEvents.map((event) => (
                  <div key={event._id} className="rounded-xl border border-border/50 bg-background/70 px-3 py-2">
                    <p className="text-sm font-medium leading-tight">{event.title}</p>
                    <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                      <p className="flex items-center gap-1.5">
                        <Clock3 className="h-3 w-3" />
                        {format(new Date(event.dateTime), "h:mm a")}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" />
                        {event.venue || "Venue TBA"} | {getOrganizationName(event)}
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
              <Button size="sm" className="w-full" onClick={addSlot}>
                <Plus className="mr-2 h-4 w-4" />
                Add Slot
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
                  <div key={slot.id} className="flex items-center justify-between rounded-lg bg-sky-100 px-2 py-1 text-xs text-sky-950">
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
                    <div key={event._id} className={`rounded-lg px-2 py-1 text-xs ${hasClash ? "bg-amber-100 text-amber-950" : "bg-orange-100 text-orange-950"}`}>
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
