import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import FeedHeader from "./_components/FeedHeader.tsx";
import OrganizationFilter from "./_components/OrganizationFilter.tsx";
import EventCard from "./_components/EventCard.tsx";
import UpcomingEventsSidebar from "./_components/UpcomingEventsSidebar.tsx";
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
import { Calendar, Loader2, X } from "lucide-react";
import { eventsAPI, organizationsAPI } from "@/lib/api";
import { toast } from "sonner";

export default function FeedPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("search");
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [canLoadMore, setCanLoadMore] = useState(false);

  // Fetch organizations
  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await organizationsAPI.list();
        setOrganizations(data);
      } catch (error) {
        console.error("Failed to fetch organizations:", error);
        toast.error("Failed to load organizations");
      }
    };
    fetch();
  }, []);

  // Fetch feed events
  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      try {
        if (searchQuery) {
          const data = await eventsAPI.search(searchQuery, 1, 10);
          setEvents(data.events);
        } else {
          const data = await eventsAPI.getFeed(1, 10, selectedOrgId || undefined);
          setEvents(data.data);
          setCanLoadMore(data.pages > 1);
        }
        setPage(1);
      } catch (error) {
        console.error("Failed to fetch events:", error);
        toast.error("Failed to load events");
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [selectedOrgId, searchQuery]);

  // Fetch upcoming events
  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await eventsAPI.getUpcoming(5);
        setUpcomingEvents(data);
      } catch (error) {
        console.error("Failed to fetch upcoming events:", error);
      }
    };
    fetch();
  }, []);

  const handleLoadMore = async () => {
    try {
      const data = await eventsAPI.getFeed(page + 1, 10, selectedOrgId || undefined);
      setEvents([...events, ...data.data]);
      setPage(page + 1);
      setCanLoadMore(data.pages > page + 1);
    } catch (error) {
      console.error("Failed to load more events:", error);
      toast.error("Failed to load more events");
    }
  };

  // Apply client-side filters to events
  const filteredEvents = events.filter((event: any) => {
    // Date filter
    if (filters.dateRange && filters.dateRange !== "all") {
      const eventDate = new Date(event.dateTime);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

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

    // Event mode filter
    if (filters.eventMode && filters.eventMode.length > 0) {
      if (!filters.eventMode.includes(event.mode as any)) return false;
    }

    // Audience filter
    if (filters.audience && filters.audience.length > 0) {
      const audienceLower = filters.audience.map((a: string) => a.toLowerCase());
      if (!event.audience || !event.audience.some((a: string) => audienceLower.includes(a))) {
        return false;
      }
    }

    return true;
  });

  const selectedOrg = organizations.find((o) => o._id === selectedOrgId);

  return (
    <div className="min-h-screen bg-background">
      <FeedHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search Results Header */}
        {searchQuery && (
          <div className="mb-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Search Results</h2>
                <p className="text-muted-foreground mt-1">Results for "{searchQuery}"</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchParams({})}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                Clear Search
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-8">
          {/* Left Sidebar - Organization Filter */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24">
              <OrganizationFilter
                organizations={organizations}
                selectedId={selectedOrgId}
                onSelect={setSelectedOrgId}
              />
            </div>
          </aside>

          {/* Main Feed */}
          <main className="flex-1 min-w-0">
            {/* Feed Header with Filters */}
            <div className="mb-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h1
                    className="text-2xl font-bold"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {selectedOrg ? selectedOrg.name : "For You"}
                  </h1>
                  <p className="text-muted-foreground text-sm mt-1">
                    {selectedOrg
                      ? "Latest events from this organization"
                      : "Discover events from across campus"}
                  </p>
                </div>
                <EventFilters
                  onFilterChange={setFilters}
                  currentFilters={filters}
                  organizations={organizations}
                />
              </div>
            </div>

            {/* Loading State */}
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

            {/* Empty State */}
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

            {/* Events Feed */}
            {!isLoading && filteredEvents.length > 0 && (
              <div className="space-y-6">
                {filteredEvents.map((event: any) => (
                  <EventCard key={event._id} event={event} />
                ))}

                {/* Load More */}
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
          </main>

          {/* Right Sidebar - Upcoming Events */}
          <aside className="hidden xl:block w-72 flex-shrink-0">
            <div className="sticky top-24">
              <UpcomingEventsSidebar events={upcomingEvents} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
