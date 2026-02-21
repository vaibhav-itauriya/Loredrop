import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import FeedHeader from "./_components/FeedHeader.tsx";
import OrganizationFilter from "./_components/OrganizationFilter.tsx";
import EventCard from "./_components/EventCard.tsx";
import UpcomingEventsSidebar from "./_components/UpcomingEventsSidebar.tsx";
import PersonalCalendarCard from "./_components/PersonalCalendarCard.tsx";
import { EventFilters, type FilterOptions } from "@/components/EventFilters.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty.tsx";
import { Calendar, Loader2 } from "lucide-react";
import { eventsAPI, organizationsAPI } from "@/lib/api";
import { getParentId } from "@/lib/org-hierarchy.ts";
import { toast } from "sonner";

export default function FeedPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const scrollToEventId = searchParams.get("event");
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [canLoadMore, setCanLoadMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchOrganizations = async () => {
      try {
        const data = await organizationsAPI.list();
        if (!cancelled) setOrganizations(data);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch organizations:", error);
          toast.error("Failed to load organizations");
        }
      }
    };
    fetchOrganizations();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchEvents = async () => {
      setIsLoading(true);
      try {
        const data = await eventsAPI.getFeed(1, 10, selectedOrgId || undefined);
        if (!cancelled) {
          const list = Array.isArray(data?.data) ? data.data : [];
          setEvents(list);
          setCanLoadMore((data?.pages ?? 1) > 1);
          setPage(1);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch events:", error);
          setEvents([]);
          const msg = error instanceof Error ? error.message : "Failed to load events";
          toast.error(msg.startsWith("API error") ? "Failed to load events" : msg);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchEvents();
    return () => {
      cancelled = true;
    };
  }, [selectedOrgId]);

  useEffect(() => {
    if (scrollToEventId && !isLoading) {
      const timer = setTimeout(() => {
        const el = document.querySelector(`[data-event-id="${scrollToEventId}"]`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        const next = new URLSearchParams(searchParams);
        next.delete("event");
        setSearchParams(next.toString() ? next : {}, { replace: true });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [scrollToEventId, isLoading, searchParams, setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    const fetchUpcoming = async () => {
      try {
        const data = await eventsAPI.getUpcoming(5);
        if (!cancelled) setUpcomingEvents(data);
      } catch (error) {
        if (!cancelled) console.error("Failed to fetch upcoming events:", error);
      }
    };
    fetchUpcoming();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (isLoading) return;
    try {
      setIsLoading(true);
      const nextPage = page + 1;
      const data = await eventsAPI.getFeed(nextPage, 10, selectedOrgId || undefined);
      const nextBatch = Array.isArray(data?.data) ? data.data : [];
      setEvents((prev) => [...prev, ...nextBatch]);
      setPage(nextPage);
      setCanLoadMore((data?.pages ?? 0) > nextPage);
    } catch (error) {
      console.error("Failed to load more events:", error);
      toast.error("Failed to load more events");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, page, selectedOrgId]);

  const filteredEvents = useMemo(() => {
    if (!events.length) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return events.filter((event: any) => {
      if (!event || typeof event !== "object") return false;
      try {
        if (filters.dateRange && filters.dateRange !== "all") {
          if (!event.dateTime) return false;
          const eventDate = new Date(event.dateTime);
          if (isNaN(eventDate.getTime())) return false;

          if (filters.dateRange === "today") {
            const todayEnd = new Date(today);
            todayEnd.setHours(23, 59, 59, 999);
            if (eventDate < today || eventDate > todayEnd) return false;
          } else if (filters.dateRange === "tomorrow") {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowEnd = new Date(tomorrow);
            tomorrowEnd.setHours(23, 59, 59, 999);
            if (eventDate < tomorrow || eventDate > tomorrowEnd) return false;
          } else if (filters.dateRange === "week") {
            const weekEnd = new Date(today);
            weekEnd.setDate(weekEnd.getDate() + 7);
            weekEnd.setHours(23, 59, 59, 999);
            if (eventDate < today || eventDate > weekEnd) return false;
          } else if (filters.dateRange === "month") {
            const monthEnd = new Date(today);
            monthEnd.setMonth(monthEnd.getMonth() + 1);
            monthEnd.setHours(23, 59, 59, 999);
            if (eventDate < today || eventDate > monthEnd) return false;
          }
        }

        if (filters.eventMode && filters.eventMode.length > 0) {
          if (!filters.eventMode.includes(event.mode as any)) return false;
        }

        if (filters.audience && filters.audience.length > 0) {
          const audienceLower = filters.audience.map((a: string) => a.toLowerCase());
          if (!event.audience || !event.audience.some((a: string) => audienceLower.includes(a))) {
            return false;
          }
        }

        return true;
      } catch (error) {
        console.error("Error filtering event:", error, event);
        return false;
      }
    });
  }, [events, filters]);

  const selectedOrg = useMemo(
    () => organizations.find((org) => org._id === selectedOrgId),
    [organizations, selectedOrgId],
  );

  const selectedOrgParent = useMemo(() => {
    if (!selectedOrg) return null;
    const parentId = getParentId(selectedOrg);
    if (!parentId) return null;
    return organizations.find((org) => org._id === parentId) || null;
  }, [organizations, selectedOrg]);

  return (
    <div className="min-h-screen bg-background">
      <FeedHeader />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24">
              <OrganizationFilter
                organizations={organizations}
                selectedId={selectedOrgId}
                onSelect={setSelectedOrgId}
              />
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            <div className="mb-6">
              <div className="mb-4">
                <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                  {selectedOrg ? selectedOrg.name : "For You"}
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  {selectedOrg
                    ? selectedOrgParent
                      ? `Latest events from ${selectedOrg.name} under ${selectedOrgParent.name}`
                      : "Latest events from this organization"
                    : "Discover events from across campus"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 py-3 px-4 rounded-xl bg-muted/30 border border-border/50 overflow-x-auto sm:overflow-visible">
                <EventFilters
                  onFilterChange={setFilters}
                  currentFilters={filters}
                  organizations={organizations}
                  variant="inline"
                />
              </div>
            </div>

            {isLoading && (
              <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-border/50 overflow-hidden">
                    <Skeleton className="aspect-video w-full" />
                    <div className="p-5 space-y-3">
                      <div className="flex items-center gap-2">
                        <Skeleton className="w-8 h-8 rounded-lg" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && filteredEvents.length === 0 && (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Calendar />
                  </EmptyMedia>
                  <EmptyTitle>No events found</EmptyTitle>
                  <EmptyDescription>
                    {selectedOrgId || Object.keys(filters).length > 0
                      ? "Try adjusting your filters or selecting a different organization."
                      : "Check back soon for upcoming campus events!"}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}

            {!isLoading && filteredEvents.length > 0 && (
              <div className="space-y-6">
                {filteredEvents.map((event: any) => (
                  <EventCard key={event._id} event={event} />
                ))}

                {canLoadMore && (
                  <div className="flex justify-center pt-4">
                    <Button variant="secondary" onClick={handleLoadMore}>
                      <Loader2 className="w-4 h-4 mr-2" />
                      Load More Events
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="xl:hidden mt-6 space-y-4">
              <PersonalCalendarCard />
              <UpcomingEventsSidebar events={upcomingEvents} />
            </div>
          </main>

          <aside className="hidden xl:block w-72 flex-shrink-0">
            <div className="sticky top-24 space-y-4 max-h-[calc(100vh-7rem)] overflow-y-auto pr-1 no-scrollbar">
              <PersonalCalendarCard />
              <UpcomingEventsSidebar events={upcomingEvents} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
