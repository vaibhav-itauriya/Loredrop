import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import FeedHeader from "./_components/FeedHeader.tsx";
import OrganizationFilter from "./_components/OrganizationFilter.tsx";
import EventCard from "./_components/EventCard.tsx";
import UpcomingEventsSidebar from "./_components/UpcomingEventsSidebar.tsx";
import PersonalCalendarCard from "./_components/PersonalCalendarCard.tsx";
import { EventFilters, type FilterOptions } from "@/components/EventFilters.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
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

  const activeOrganizationIds = useMemo(() => {
    const selected = selectedOrgId ? [selectedOrgId] : [];
    const extra = filters.organizations || [];
    return Array.from(new Set([...selected, ...extra]));
  }, [filters.organizations, selectedOrgId]);

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
        const data = await eventsAPI.getFeed(1, 10, undefined, {
          organizationIds: activeOrganizationIds,
          eventMode: filters.eventMode,
          audience: filters.audience,
          dateRange: filters.dateRange,
        });
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
  }, [activeOrganizationIds, filters.audience, filters.dateRange, filters.eventMode]);

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
      const data = await eventsAPI.getFeed(nextPage, 10, undefined, {
        organizationIds: activeOrganizationIds,
        eventMode: filters.eventMode,
        audience: filters.audience,
        dateRange: filters.dateRange,
      });
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
  }, [activeOrganizationIds, filters.audience, filters.dateRange, filters.eventMode, isLoading, page]);

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

  const activeFilterCount = useMemo(
    () =>
      [
        filters.dateRange && filters.dateRange !== "all" ? 1 : 0,
        filters.eventMode?.length ?? 0,
        filters.audience?.length ?? 0,
        filters.organizations?.length ?? 0,
      ].reduce((sum, value) => sum + value, 0),
    [filters],
  );

  return (
    <div className="min-h-screen bg-background">
      <FeedHeader />

      <div className="max-w-7xl mx-auto px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        {organizations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08, ease: "easeOut" }}
            className="mt-4 lg:hidden"
          >
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              <Button
                variant={selectedOrgId === null ? "default" : "outline"}
                className="rounded-full"
                onClick={() => setSelectedOrgId(null)}
              >
                For You
              </Button>
              {organizations.slice(0, 10).map((org) => (
                <Button
                  key={org._id}
                  variant={selectedOrgId === org._id ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setSelectedOrgId(org._id)}
                >
                  {org.name}
                </Button>
              ))}
            </div>
          </motion.div>
        )}

        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <aside className="hidden w-64 flex-shrink-0 lg:block">
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.1, ease: "easeOut" }}
              className="sticky top-24"
            >
              <OrganizationFilter
                organizations={organizations}
                selectedId={selectedOrgId}
                onSelect={setSelectedOrgId}
              />
            </motion.div>
          </aside>

          <main className="min-w-0 flex-1">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.14, ease: "easeOut" }}
              className="mb-6 mt-4 lg:mt-6"
            >
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Refine results</p>
                  <h2 className="mt-1 text-xl font-semibold">Tune the feed in real time</h2>
                </div>
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="w-fit rounded-full px-3 py-1">
                    {activeFilterCount} active
                  </Badge>
                )}
              </div>
              <div className="overflow-x-auto rounded-[1.5rem] border border-border/60 bg-card/70 px-4 py-4 shadow-[0_18px_60px_rgba(16,24,40,0.05)] backdrop-blur-sm sm:overflow-visible">
                <EventFilters
                  onFilterChange={setFilters}
                  currentFilters={filters}
                  organizations={organizations}
                  variant="inline"
                />
              </div>
            </motion.div>

            {isLoading && (
              <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-[1.75rem] border border-border/50 bg-card/70">
                    <Skeleton className="aspect-video w-full" />
                    <div className="space-y-3 p-5">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-8 rounded-lg" />
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

            {!isLoading && events.length === 0 && (
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

            {!isLoading && events.length > 0 && (
              <div className="space-y-6">
                {events.map((event: any, index: number) => (
                  <motion.div
                    key={event._id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.3), ease: "easeOut" }}
                  >
                    <EventCard event={event} />
                  </motion.div>
                ))}

                {canLoadMore && (
                  <div className="flex justify-center pt-4">
                    <Button variant="secondary" onClick={handleLoadMore} className="rounded-full px-5">
                      <Loader2 className="mr-2 h-4 w-4" />
                      Load More Events
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 space-y-4 xl:hidden">
              <PersonalCalendarCard />
              <UpcomingEventsSidebar events={upcomingEvents} />
            </div>
          </main>

          <aside className="hidden w-72 flex-shrink-0 xl:block">
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.18, ease: "easeOut" }}
              className="sticky top-24 space-y-4 max-h-[calc(100vh-7rem)] overflow-y-auto pr-1 no-scrollbar"
            >
              <PersonalCalendarCard />
              <UpcomingEventsSidebar events={upcomingEvents} />
            </motion.div>
          </aside>
        </div>
      </div>
    </div>
  );
}
