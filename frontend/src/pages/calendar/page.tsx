import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Clock3,
  GraduationCap,
  MapPin,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import FeedHeader from "../feed/_components/FeedHeader.tsx";
import EventCard from "../feed/_components/EventCard.tsx";
import { interactionsAPI } from "@/lib/api";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Calendar } from "@/components/ui/calendar.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { toast } from "sonner";

type SavedCalendarItem = { _id: string; eventId: any };
type PlannerEvent = {
  id: string;
  title: string;
  description?: string;
  dateTime: string;
  endDateTime?: string;
  venue?: string;
  mode?: string;
  organizationName: string;
  raw: any;
  saveId: string;
};
type AcademicSlot = {
  id: string;
  title: string;
  day: number;
  startTime: string;
  endTime: string;
  location: string;
};
type ClashItem = { slot: AcademicSlot; event: PlannerEvent };

const TIMETABLE_STORAGE_KEY = "loredrop-academic-timetable-v1";
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DEFAULT_SLOT_FORM = {
  title: "",
  day: "0",
  startTime: "09:00",
  endTime: "10:00",
  location: "",
};

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function getEventEnd(event: PlannerEvent) {
  if (event.endDateTime) return new Date(event.endDateTime);
  return new Date(new Date(event.dateTime).getTime() + 60 * 60 * 1000);
}

function getWeekdayIndex(date: Date) {
  return (date.getDay() + 6) % 7;
}

function overlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
}

export default function CalendarPage() {
  const [savedEvents, setSavedEvents] = useState<SavedCalendarItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthCursor, setMonthCursor] = useState(new Date());
  const [plannerView, setPlannerView] = useState<"month" | "week">("month");
  const [slotForm, setSlotForm] = useState(DEFAULT_SLOT_FORM);
  const [academicSlots, setAcademicSlots] = useState<AcademicSlot[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(TIMETABLE_STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) setAcademicSlots(parsed);
    } catch {
      console.error("Failed to parse academic timetable");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(TIMETABLE_STORAGE_KEY, JSON.stringify(academicSlots));
  }, [academicSlots]);

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      try {
        const data = await interactionsAPI.getCalendarSaves();
        setSavedEvents(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch calendar saves:", error);
        toast.error("Failed to load saved events");
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, []);

  const normalizedEvents = useMemo<PlannerEvent[]>(() => {
    const mapped: PlannerEvent[] = [];
    savedEvents.forEach((item) => {
      const event = item.eventId;
      if (!event?.dateTime) return;
      mapped.push({
        id: String(event._id || item._id),
        title: event.title || "Untitled Event",
        description: event.description,
        dateTime: event.dateTime,
        endDateTime: event.endDateTime,
        venue: event.venue,
        mode: event.mode,
        organizationName: event.organizationId?.name || "Campus Organization",
        raw: event,
        saveId: item._id,
      });
    });
    return mapped.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  }, [savedEvents]);

  const selectedDateEvents = useMemo(
    () => normalizedEvents.filter((event) => isSameDay(new Date(event.dateTime), selectedDate)),
    [normalizedEvents, selectedDate],
  );

  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return normalizedEvents.filter((event) => new Date(event.dateTime).getTime() >= now);
  }, [normalizedEvents]);

  const thisWeekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
  const thisWeekEnd = useMemo(() => endOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
  const weekDates = useMemo(
    () => eachDayOfInterval({ start: thisWeekStart, end: thisWeekEnd }),
    [thisWeekEnd, thisWeekStart],
  );
  const weekEvents = useMemo(
    () =>
      normalizedEvents.filter((event) =>
        isWithinInterval(new Date(event.dateTime), { start: thisWeekStart, end: thisWeekEnd }),
      ),
    [normalizedEvents, thisWeekEnd, thisWeekStart],
  );

  const eventDates = useMemo(() => normalizedEvents.map((event) => new Date(event.dateTime)), [normalizedEvents]);
  const busyDates = useMemo(() => {
    const counts = new Map<string, number>();
    normalizedEvents.forEach((event) => {
      const key = format(new Date(event.dateTime), "yyyy-MM-dd");
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries())
      .filter(([, count]) => count >= 2)
      .map(([key]) => new Date(key));
  }, [normalizedEvents]);

  const monthHighlights = useMemo(() => {
    const monthStart = startOfMonth(monthCursor);
    const monthEnd = endOfMonth(monthCursor);
    const monthEvents = normalizedEvents.filter((event) =>
      isWithinInterval(new Date(event.dateTime), { start: monthStart, end: monthEnd }),
    );
    return {
      eventCount: monthEvents.length,
      activeDays: new Set(monthEvents.map((event) => format(new Date(event.dateTime), "yyyy-MM-dd"))).size,
    };
  }, [monthCursor, normalizedEvents]);

  const clashes = useMemo<ClashItem[]>(() => {
    return weekEvents.flatMap((event) => {
      const eventDate = new Date(event.dateTime);
      const weekday = getWeekdayIndex(eventDate);
      const eventStart = eventDate.getHours() * 60 + eventDate.getMinutes();
      const eventEndDate = getEventEnd(event);
      const eventEnd = eventEndDate.getHours() * 60 + eventEndDate.getMinutes();
      return academicSlots
        .filter((slot) =>
          slot.day === weekday &&
          overlaps(eventStart, eventEnd, toMinutes(slot.startTime), toMinutes(slot.endTime)),
        )
        .map((slot) => ({ slot, event }));
    });
  }, [academicSlots, weekEvents]);

  const visibleStartHour = useMemo(() => {
    const slotStarts = academicSlots.map((slot) => Math.floor(toMinutes(slot.startTime) / 60));
    const eventStarts = weekEvents.map((event) => new Date(event.dateTime).getHours());
    return Math.max(6, Math.min(8, ...slotStarts, ...eventStarts));
  }, [academicSlots, weekEvents]);

  const visibleEndHour = useMemo(() => {
    const slotEnds = academicSlots.map((slot) => Math.ceil(toMinutes(slot.endTime) / 60));
    const eventEnds = weekEvents.map((event) => getEventEnd(event).getHours() + 1);
    return Math.min(23, Math.max(18, ...slotEnds, ...eventEnds));
  }, [academicSlots, weekEvents]);

  const hourLabels = useMemo(
    () => Array.from({ length: visibleEndHour - visibleStartHour + 1 }, (_, i) => visibleStartHour + i),
    [visibleEndHour, visibleStartHour],
  );

  const weekGridEvents = useMemo(
    () =>
      weekDates.map((date) => {
        const dayIndex = getWeekdayIndex(date);
        return {
          date,
          dayIndex,
          slots: academicSlots.filter((slot) => slot.day === dayIndex),
          events: weekEvents.filter((event) => isSameDay(new Date(event.dateTime), date)),
        };
      }),
    [academicSlots, weekDates, weekEvents],
  );

  const addSlot = () => {
    const startMinutes = toMinutes(slotForm.startTime);
    const endMinutes = toMinutes(slotForm.endTime);
    if (!slotForm.title.trim()) return toast.error("Add a subject or class title");
    if (endMinutes <= startMinutes) return toast.error("End time must be after start time");
    const nextSlot: AcademicSlot = {
      id: `${Date.now()}`,
      title: slotForm.title.trim(),
      day: Number(slotForm.day),
      startTime: slotForm.startTime,
      endTime: slotForm.endTime,
      location: slotForm.location.trim(),
    };
    setAcademicSlots((current) =>
      [...current, nextSlot].sort((a, b) => (a.day !== b.day ? a.day - b.day : toMinutes(a.startTime) - toMinutes(b.startTime))),
    );
    setSlotForm(DEFAULT_SLOT_FORM);
  };

  const removeSlot = (slotId: string) => {
    setAcademicSlots((current) => current.filter((slot) => slot.id !== slotId));
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5f1e8_0%,#fffdf8_18%,hsl(var(--background))_48%)]">
      <FeedHeader />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
      >
        <div className="mb-8 flex flex-col gap-5 rounded-[2rem] border border-border/60 bg-background/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <Link to="/feed">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Academic Planner
                </div>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
                  Calendar, timetable, and clash tracking in one place
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Save events, map your weekly classes, and spot where campus plans overlap with your academic routine.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant={plannerView === "month" ? "default" : "outline"} className="rounded-full" onClick={() => setPlannerView("month")}>
                Month Planner
              </Button>
              <Button variant={plannerView === "week" ? "default" : "outline"} className="rounded-full" onClick={() => setPlannerView("week")}>
                Weekly Timetable
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <Card className="rounded-[1.5rem] border-primary/10 bg-[linear-gradient(135deg,rgba(14,116,144,0.12),rgba(249,115,22,0.1))] p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Saved Events</p>
              <p className="mt-3 text-3xl font-semibold">{normalizedEvents.length}</p>
              <p className="mt-1 text-sm text-muted-foreground">Events parked in your personal calendar.</p>
            </Card>
            <Card className="rounded-[1.5rem] border-border/60 bg-background p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">This Month</p>
              <p className="mt-3 text-3xl font-semibold">{monthHighlights.eventCount}</p>
              <p className="mt-1 text-sm text-muted-foreground">{monthHighlights.activeDays} active days on your planner.</p>
            </Card>
            <Card className="rounded-[1.5rem] border-border/60 bg-background p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Weekly Classes</p>
              <p className="mt-3 text-3xl font-semibold">{academicSlots.length}</p>
              <p className="mt-1 text-sm text-muted-foreground">Local timetable blocks stored on this device.</p>
            </Card>
            <Card className="rounded-[1.5rem] border-border/60 bg-background p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Potential Clashes</p>
              <p className="mt-3 text-3xl font-semibold">{clashes.length}</p>
              <p className="mt-1 text-sm text-muted-foreground">Overlaps detected for the selected week.</p>
            </Card>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <Skeleton className="h-[620px] rounded-[2rem]" />
            <Skeleton className="h-[620px] rounded-[2rem]" />
          </div>
        ) : normalizedEvents.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarDays />
              </EmptyMedia>
              <EmptyTitle>No saved events yet</EmptyTitle>
              <EmptyDescription>
                Start saving events from the feed, then come back here to place them against your weekly academic timetable.
              </EmptyDescription>
            </EmptyHeader>
            <Link to="/feed">
              <Button className="mt-4">Explore Events</Button>
            </Link>
          </Empty>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <Card className="overflow-hidden rounded-[2rem] border-border/60 bg-background/95 shadow-[0_14px_50px_rgba(15,23,42,0.05)]">
                <div className="border-b border-border/60 bg-[linear-gradient(180deg,rgba(255,248,235,0.95),rgba(255,255,255,0.92))] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Planner Overview</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Click any day to review your saved events and compare them against class timings.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="rounded-full px-3 py-1">
                        {format(monthCursor, "MMMM yyyy")}
                      </Badge>
                      {upcomingEvents[0] && (
                        <Badge variant="outline" className="rounded-full px-3 py-1">
                          Next: {format(new Date(upcomingEvents[0].dateTime), "MMM d")}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-5">
                  <Calendar
                    mode="single"
                    month={monthCursor}
                    onMonthChange={setMonthCursor}
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (!date) return;
                      setSelectedDate(date);
                    }}
                    className="w-full rounded-[1.5rem] border border-border/60 bg-background p-4"
                    classNames={{
                      root: "w-full",
                      month: "w-full gap-5",
                      months: "w-full",
                      table: "w-full border-separate border-spacing-y-1.5",
                      head_row: "grid grid-cols-7 gap-1",
                      row: "grid grid-cols-7 gap-1",
                      weekday: "flex h-9 items-center justify-center rounded-full bg-muted/50 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground",
                      day: "aspect-auto min-h-[5.75rem]",
                    }}
                    modifiers={{ hasEvents: eventDates, busyDay: busyDates, selectedWeek: weekDates }}
                    modifiersClassNames={{ hasEvents: "ring-1 ring-primary/25", busyDay: "bg-amber-50", selectedWeek: "border-primary/20" }}
                    components={{
                      DayButton: ({ day, ...props }) => {
                        const date = day.date;
                        const dayEvents = normalizedEvents.filter((event) => isSameDay(new Date(event.dateTime), date));
                        const isCurrentMonth = isSameMonth(date, monthCursor);
                        const isSelected = isSameDay(date, selectedDate);
                        return (
                          <button
                            {...props}
                            type="button"
                            className={`h-full w-full rounded-2xl border p-2 text-left transition ${
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground shadow-[0_12px_24px_rgba(14,116,144,0.25)]"
                                : isCurrentMonth
                                  ? "border-border/60 bg-background hover:border-primary/30 hover:bg-primary/5"
                                  : "border-transparent bg-muted/20 text-muted-foreground/70"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm font-semibold">{format(date, "d")}</span>
                              {dayEvents.length > 0 && (
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isSelected ? "bg-white/15 text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                                  {dayEvents.length}
                                </span>
                              )}
                            </div>
                            <div className="mt-5 space-y-1">
                              {dayEvents.slice(0, 2).map((event) => (
                                <div key={`${event.id}-${format(date, "yyyyMMdd")}`} className={`truncate rounded-full px-2 py-1 text-[10px] ${isSelected ? "bg-white/14 text-primary-foreground" : "bg-muted text-foreground"}`}>
                                  {event.title}
                                </div>
                              ))}
                              {dayEvents.length > 2 && (
                                <p className={`text-[10px] ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                                  +{dayEvents.length - 2} more
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      },
                    }}
                  />
                </div>
              </Card>

              <div className="space-y-6">
                <Card className="rounded-[2rem] border-border/60 bg-background p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Selected Day</p>
                      <h2 className="mt-1 text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                        {format(selectedDate, "EEEE, MMMM d")}
                      </h2>
                    </div>
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      {selectedDateEvents.length} event{selectedDateEvents.length === 1 ? "" : "s"}
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-3">
                    {selectedDateEvents.length === 0 ? (
                      <div className="rounded-[1.5rem] border border-dashed border-border/70 bg-muted/20 p-5 text-sm text-muted-foreground">
                        Nothing saved on this date yet. Pick another day or add more events from the feed.
                      </div>
                    ) : (
                      selectedDateEvents.map((event) => (
                        <div key={event.id} className="rounded-[1.25rem] border border-border/60 bg-muted/20 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-base font-semibold text-foreground">{event.title}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{event.organizationName}</p>
                            </div>
                            <Badge className="rounded-full bg-primary/10 text-primary">{event.mode || "Event"}</Badge>
                          </div>
                          <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                            <p className="flex items-center gap-2">
                              <Clock3 className="h-4 w-4" />
                              {format(new Date(event.dateTime), "h:mm a")} to {format(getEventEnd(event), "h:mm a")}
                            </p>
                            <p className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {event.venue || "Venue TBA"}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>

                <Card className="rounded-[2rem] border-border/60 bg-background p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Timetable Health</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Based on the week of {format(thisWeekStart, "MMM d")} to {format(thisWeekEnd, "MMM d")}.
                      </p>
                    </div>
                    {clashes.length > 0 ? (
                      <Badge variant="destructive" className="rounded-full px-3 py-1">{clashes.length} clash{clashes.length === 1 ? "" : "es"}</Badge>
                    ) : (
                      <Badge variant="secondary" className="rounded-full px-3 py-1">Clear week</Badge>
                    )}
                  </div>

                  <div className="mt-4 space-y-3">
                    {clashes.length === 0 ? (
                      <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-900">
                        No weekly clashes detected between your saved events and academic timetable.
                      </div>
                    ) : (
                      clashes.slice(0, 4).map(({ slot, event }) => (
                        <div key={`${slot.id}-${event.id}`} className="rounded-[1.25rem] border border-amber-200 bg-amber-50/80 p-4">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700" />
                            <div>
                              <p className="text-sm font-semibold text-amber-950">{event.title} overlaps with {slot.title}</p>
                              <p className="mt-1 text-sm text-amber-900/80">
                                {WEEKDAY_LABELS[slot.day]} {slot.startTime}-{slot.endTime} · {format(new Date(event.dateTime), "h:mm a")}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <Card className="overflow-hidden rounded-[2rem] border-border/60 bg-background">
                <div className="border-b border-border/60 bg-[linear-gradient(180deg,rgba(232,244,255,0.6),rgba(255,255,255,0.95))] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Weekly Timetable</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Add your recurring class blocks and compare them with events saved for this week.
                      </p>
                    </div>
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      {format(thisWeekStart, "MMM d")} - {format(thisWeekEnd, "MMM d")}
                    </Badge>
                  </div>
                </div>

                <div className="p-5">
                  <div className="grid gap-3 rounded-[1.5rem] border border-border/60 bg-muted/15 p-4 md:grid-cols-6">
                    <Input value={slotForm.title} onChange={(e) => setSlotForm((current) => ({ ...current, title: e.target.value }))} placeholder="Course or lab" className="md:col-span-2" />
                    <select
                      value={slotForm.day}
                      onChange={(e) => setSlotForm((current) => ({ ...current, day: e.target.value }))}
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {WEEKDAY_LABELS.map((label, index) => (
                        <option key={label} value={index}>{label}</option>
                      ))}
                    </select>
                    <Input type="time" value={slotForm.startTime} onChange={(e) => setSlotForm((current) => ({ ...current, startTime: e.target.value }))} />
                    <Input type="time" value={slotForm.endTime} onChange={(e) => setSlotForm((current) => ({ ...current, endTime: e.target.value }))} />
                    <Input value={slotForm.location} onChange={(e) => setSlotForm((current) => ({ ...current, location: e.target.value }))} placeholder="Room / building" />
                    <div className="md:col-span-6">
                      <Button onClick={addSlot} className="rounded-full">
                        <Plus className="mr-2 h-4 w-4" />
                        Add To Timetable
                      </Button>
                    </div>
                  </div>

                  <div className="mt-5 overflow-x-auto">
                    <div className="min-w-[860px]">
                      <div className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))] gap-2">
                        <div />
                        {weekGridEvents.map(({ date }, index) => (
                          <div key={index} className={`rounded-2xl border px-3 py-3 text-center ${isSameDay(date, selectedDate) ? "border-primary/40 bg-primary/8" : "border-border/60 bg-muted/10"}`}>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{WEEKDAY_LABELS[index]}</p>
                            <p className="mt-1 text-lg font-semibold text-foreground">{format(date, "d")}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 grid grid-cols-[72px_repeat(7,minmax(0,1fr))] gap-2">
                        <div className="space-y-2 pt-2">
                          {hourLabels.map((hour) => (
                            <div key={hour} className="flex h-20 items-start justify-end pr-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                              {format(new Date(2026, 0, 1, hour), "ha")}
                            </div>
                          ))}
                        </div>

                        {weekGridEvents.map(({ slots, events }, dayIndex) => {
                          const totalHeight = hourLabels.length * 80;
                          return (
                            <div key={dayIndex} className="relative rounded-[1.5rem] border border-border/60 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,0.95))]" style={{ height: totalHeight }}>
                              {hourLabels.map((hour) => (
                                <div key={hour} className="absolute inset-x-0 border-t border-dashed border-border/50" style={{ top: (hour - visibleStartHour) * 80 }} />
                              ))}

                              {slots.map((slot) => {
                                const top = ((toMinutes(slot.startTime) - visibleStartHour * 60) / 60) * 80;
                                const height = ((toMinutes(slot.endTime) - toMinutes(slot.startTime)) / 60) * 80;
                                return (
                                  <div key={slot.id} className="absolute left-2 right-2 overflow-hidden rounded-2xl border border-sky-200 bg-sky-100/90 p-2 text-xs shadow-sm" style={{ top, height }}>
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <p className="font-semibold text-sky-950">{slot.title}</p>
                                        <p className="mt-1 text-sky-900/70">{slot.startTime}-{slot.endTime}</p>
                                        {slot.location && <p className="mt-1 truncate text-sky-900/65">{slot.location}</p>}
                                      </div>
                                      <GraduationCap className="h-3.5 w-3.5 shrink-0 text-sky-700" />
                                    </div>
                                  </div>
                                );
                              })}

                              {events.map((event) => {
                                const start = new Date(event.dateTime);
                                const end = getEventEnd(event);
                                const top = (((start.getHours() * 60 + start.getMinutes()) - visibleStartHour * 60) / 60) * 80;
                                const height = (((end.getHours() * 60 + end.getMinutes()) - (start.getHours() * 60 + start.getMinutes())) / 60) * 80;
                                const hasClash = clashes.some((item) => item.event.id === event.id && item.slot.day === dayIndex);
                                return (
                                  <div key={event.id} className={`absolute left-6 right-2 overflow-hidden rounded-2xl border p-2 text-xs shadow-sm ${hasClash ? "border-amber-300 bg-amber-100/92" : "border-orange-200 bg-orange-100/92"}`} style={{ top, height: Math.max(height, 48) }}>
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="truncate font-semibold text-slate-950">{event.title}</p>
                                        <p className="mt-1 truncate text-slate-700">{format(start, "h:mm a")} - {format(end, "h:mm a")}</p>
                                        <p className="truncate text-slate-600">{event.organizationName}</p>
                                      </div>
                                      {hasClash && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700" />}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="space-y-6">
                <Card className="rounded-[2rem] border-border/60 bg-background p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">My Academic Timetable</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        These entries stay in your browser, so you can build your own weekly routine.
                      </p>
                    </div>
                    {academicSlots.length > 0 && <Badge variant="secondary" className="rounded-full px-3 py-1">{academicSlots.length} slots</Badge>}
                  </div>

                  <div className="mt-4 space-y-3">
                    {academicSlots.length === 0 ? (
                      <div className="rounded-[1.5rem] border border-dashed border-border/70 bg-muted/20 p-5 text-sm text-muted-foreground">
                        Add your classes or labs above to unlock weekly clash detection.
                      </div>
                    ) : (
                      academicSlots.map((slot) => (
                        <div key={slot.id} className="flex items-start justify-between gap-3 rounded-[1.25rem] border border-border/60 bg-muted/20 p-4">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{slot.title}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{WEEKDAY_LABELS[slot.day]} · {slot.startTime}-{slot.endTime}</p>
                            {slot.location && <p className="mt-1 text-xs text-muted-foreground">{slot.location}</p>}
                          </div>
                          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => removeSlot(slot.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </Card>

                <Card className="rounded-[2rem] border-border/60 bg-background p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Upcoming Saved Events</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Quick list for the next few items on your personal calendar.
                      </p>
                    </div>
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>

                  <div className="mt-4 space-y-3">
                    {upcomingEvents.slice(0, 5).map((event) => {
                      const daysAway = differenceInCalendarDays(new Date(event.dateTime), new Date());
                      return (
                        <div key={event.id} className="rounded-[1.25rem] border border-border/60 bg-muted/20 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{event.title}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{event.organizationName}</p>
                            </div>
                            <Badge variant="outline" className="rounded-full">{daysAway <= 0 ? "Today" : `${daysAway}d`}</Badge>
                          </div>
                          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock3 className="h-3.5 w-3.5" />
                            {format(new Date(event.dateTime), "EEE, MMM d · h:mm a")}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            </div>

            <Card className="rounded-[2rem] border-border/60 bg-background p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Saved Event Cards</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Full event details remain here so you can still review everything without leaving the planner.
                  </p>
                </div>
                <Badge variant="secondary" className="rounded-full px-3 py-1">{normalizedEvents.length} total</Badge>
              </div>

              <div className="mt-5 space-y-6">
                {normalizedEvents.map((event) => (
                  <motion.div key={event.saveId} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                    <EventCard event={event.raw} />
                  </motion.div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </motion.div>
    </div>
  );
}
