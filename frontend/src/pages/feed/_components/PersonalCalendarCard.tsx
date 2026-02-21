import { useEffect, useMemo, useState } from "react";
import { format, isAfter, isSameDay, startOfDay } from "date-fns";
import { BellRing, CalendarDays, Clock3, MapPin } from "lucide-react";
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
  organizationId?: { name?: string } | string;
};

export default function PersonalCalendarCard() {
  const currentYear = new Date().getFullYear();
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchText, setSearchText] = useState("");
  const [upcomingOnly, setUpcomingOnly] = useState(true);
  const [loading, setLoading] = useState(true);

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

      const deduped = Array.from(
        new Map(collected.map((event) => [event._id, event])).values(),
      )
        .filter((event) => event?.dateTime)
        .sort(
          (a, b) =>
            new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
        );

      setEvents(deduped);
    } catch (error) {
      console.error("Failed to load campus calendar:", error);
      toast.error("Failed to load IITK events calendar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampusEvents();
  }, []);

  const scopedEvents = useMemo(() => {
    const now = new Date();
    if (!upcomingOnly) return events;
    return events.filter((event) => isAfter(new Date(event.dateTime), now));
  }, [events, upcomingOnly]);

  const eventDates = useMemo(() => {
    return scopedEvents.map((event) => startOfDay(new Date(event.dateTime)));
  }, [scopedEvents]);

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
      .sort(
        (a, b) =>
          new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
      );
  }, [scopedEvents, selectedDate]);

  const selectedDateEvents = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return selectedDateAllEvents;
    return selectedDateAllEvents.filter((event) =>
      event.title.toLowerCase().includes(query),
    );
  }, [selectedDateAllEvents, searchText]);

  const next48HoursCount = useMemo(() => {
    const now = new Date();
    const twoDaysAhead = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    return scopedEvents.filter((event) => {
      const eventTime = new Date(event.dateTime).getTime();
      return eventTime >= now.getTime() && eventTime <= twoDaysAhead.getTime();
    }).length;
  }, [scopedEvents]);

  const getOrganizationName = (event: CampusEvent) => {
    if (!event.organizationId) return "IIT Kanpur";
    if (typeof event.organizationId === "string") return "IIT Kanpur";
    return event.organizationId.name || "IIT Kanpur";
  };

  return (
    <Card className="overflow-hidden border-border/60 bg-gradient-to-b from-background via-background to-primary/5">
      <div className="p-4 border-b border-border/60">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              IIT Kanpur Calendar
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Campus events mapped by date and time
            </p>
          </div>
          {next48HoursCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              <BellRing className="w-3 h-3" />
              {next48HoursCount} soon
            </Badge>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(new Date())}
          >
            Today
          </Button>
          <Button
            type="button"
            variant={upcomingOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setUpcomingOnly((prev) => !prev)}
          >
            {upcomingOnly ? "Upcoming Only" : "All Events"}
          </Button>
        </div>
      </div>

      <div className="p-2">
        {loading ? (
          <div className="space-y-2 p-2">
            <Skeleton className="h-48 w-full rounded-lg" />
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
            className="w-full"
            modifiers={{
              hasEvents: eventDates,
              busyDay: busyDates,
            }}
            modifiersClassNames={{
              hasEvents:
                "relative after:absolute after:bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary",
              busyDay: "ring-1 ring-primary/50 rounded-md",
            }}
          />
        )}
      </div>

      <div className="border-t border-border/60 p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
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
          className="mb-3 h-8 text-xs"
        />
        <div className="space-y-2 max-h-56 overflow-auto pr-1 no-scrollbar">
          {selectedDateEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No campus events for this day.
            </p>
          ) : (
            selectedDateEvents.map((event) => (
              <div
                key={event._id}
                className="rounded-lg border border-border/50 bg-background/60 px-3 py-2"
              >
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
    </Card>
  );
}
