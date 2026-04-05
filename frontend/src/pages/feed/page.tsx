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
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth.ts";

const FEED_STATE_KEY = "feed-page-state";

export default function FeedPage() {
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const scrollToEventId = searchParams.get("event");
  const [hasRestoredState, setHasRestoredState] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [feedMode, setFeedMode] = useState<"forYou" | "subscribed" | "trending" | "upcoming">("forYou");
  const [filters, setFilters] = useState<FilterOptions>({});
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [recommendedEvents, setRecommendedEvents] = useState<any[]>([]);
  const [subscribedOrganizations, setSubscribedOrganizations] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [adminOrgIds, setAdminOrgIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [canLoadMore, setCanLoadMore] = useState(false);

  const isForYouSelected = feedMode === "forYou";
  const isSubscribedSelected = feedMode === "subscribed";
  const isTrendingSelected = feedMode === "trending";
  const isUpcomingSelected = feedMode === "upcoming";
  const subscribedOrgIds = useMemo(
    () => subscribedOrganizations.map((org: any) => org._id),
    [subscribedOrganizations]
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem(FEED_STATE_KEY);
      if (!saved) {
        setHasRestoredState(true);
        return;
      }
      const parsed = JSON.parse(saved);
      if (parsed?.feedMode) setFeedMode(parsed.feedMode);
      if (parsed?.selectedOrgId) setSelectedOrgId(parsed.selectedOrgId);
      if (parsed?.filters) setFilters(parsed.filters);
    } catch (error) {
      console.error("Failed to restore feed state:", error);
    } finally {
      setHasRestoredState(true);
    }
  }, []);

  useEffect(() => {
    if (!hasRestoredState) return;
    localStorage.setItem(
      FEED_STATE_KEY,
      JSON.stringify({ feedMode, selectedOrgId, filters })
    );
  }, [feedMode, filters, hasRestoredState, selectedOrgId]);

  const activeOrganizationIds = useMemo(() => {
    if (isSubscribedSelected && isAuthenticated) {
      return subscribedOrgIds;
    }
    const selected = selectedOrgId ? [selectedOrgId] : [];
    const extra = filters.organizations || [];
    return Array.from(new Set([...selected, ...extra]));
  }, [filters.organizations, isAuthenticated, isSubscribedSelected, selectedOrgId, subscribedOrgIds]);

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
    if (!isAuthenticated) {
      setSubscribedOrganizations([]);
      setAdminOrgIds([]);
      return;
    }

    let cancelled = false;
    const fetchSubscriptions = async () => {
      try {
        const data = await organizationsAPI.getMySubscriptions();
        if (!cancelled) {
          setSubscribedOrganizations(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch subscriptions:", error);
          setSubscribedOrganizations([]);
        }
      }
    };
    fetchSubscriptions();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setAdminOrgIds([]);
      return;
    }

    let cancelled = false;
    const fetchMemberships = async () => {
      try {
        const membershipData = await organizationsAPI.getUserMemberships();
        if (!cancelled) {
          const orgIds = (membershipData?.organizations || [])
            .filter((org: any) => org.role === "owner" || org.role === "admin")
            .map((org: any) => String(org._id));
          setAdminOrgIds(orgIds);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch admin memberships:", error);
          setAdminOrgIds([]);
        }
      }
    };
    fetchMemberships();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setRecommendedEvents([]);
      return;
    }
    let cancelled = false;
    const fetchRecommended = async () => {
      try {
        const data = await eventsAPI.getRecommended();
        if (!cancelled) {
          setRecommendedEvents(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch recommended events:", error);
          setRecommendedEvents([]);
        }
      }
    };
    fetchRecommended();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

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

  const handleSubscriptionChange = useCallback(
    (organizationId: string, subscribed: boolean) => {
      const organization = organizations.find((item) => item._id === organizationId);
      setSubscribedOrganizations((prev) => {
        if (subscribed) {
          if (prev.some((item) => item._id === organizationId)) return prev;
          return organization ? [organization, ...prev] : prev;
        }
        return prev.filter((item) => item._id !== organizationId);
      });
    },
    [organizations]
  );

  const displayedEvents = useMemo(() => {
    const baseEvents = [...events];
    if (isUpcomingSelected) {
      return baseEvents
        .filter((event) => new Date(event.dateTime).getTime() >= Date.now())
        .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
    }
    if (isTrendingSelected) {
      return baseEvents.sort((a, b) => {
        const aScore = (a.upvoteCount || 0) * 3 + (a.commentCount || 0) * 2 + (a.rsvpCount || 0);
        const bScore = (b.upvoteCount || 0) * 3 + (b.commentCount || 0) * 2 + (b.rsvpCount || 0);
        return bScore - aScore;
      });
    }
    return baseEvents;
  }, [events, isTrendingSelected, isUpcomingSelected]);

  const trendingEvents = useMemo(
    () =>
      [...events]
        .sort(
          (a, b) =>
            ((b.upvoteCount || 0) * 3 + (b.commentCount || 0) * 2 + (b.rsvpCount || 0)) -
            ((a.upvoteCount || 0) * 3 + (a.commentCount || 0) * 2 + (a.rsvpCount || 0))
        )
        .slice(0, 4),
    [events]
  );

  const todayEvents = useMemo(
    () =>
      [...events]
        .filter((event) => {
          const date = new Date(event.dateTime);
          const now = new Date();
          return (
            date.getDate() === now.getDate() &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear()
          );
        })
        .slice(0, 4),
    [events]
  );

  const trendingOrganizations = useMemo(() => {
    const byOrg = new Map<string, { name: string; score: number }>();
    events.forEach((event) => {
      const orgId = String(event.organizationId?._id || event.organizationId || "");
      if (!orgId) return;
      const current = byOrg.get(orgId) || {
        name: event.organizationId?.name || "Organization",
        score: 0,
      };
      current.score += (event.upvoteCount || 0) * 2 + (event.commentCount || 0) + (event.rsvpCount || 0);
      byOrg.set(orgId, current);
    });
    return Array.from(byOrg.entries())
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 5);
  }, [events]);

  const registrationSoonEvents = useMemo(
    () =>
      [...events]
        .filter((event) => event.registrationLink && new Date(event.dateTime).getTime() > Date.now())
        .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
        .slice(0, 3),
    [events]
  );

  const resetFeedView = useCallback(() => {
    setFeedMode("forYou");
    setSelectedOrgId(null);
    setFilters({});
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(252,211,77,0.18),transparent_24%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_50%_18%,rgba(45,212,191,0.1),transparent_24%),linear-gradient(180deg,#fcfcfd_0%,#f6f8fb_48%,#eef2f7_100%)]">
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.85),rgba(255,255,255,0))] blur-3xl"
        animate={{ x: [0, 28, 0], y: [0, -14, 0], opacity: [0.45, 0.75, 0.45] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-5rem] top-[18rem] h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.15),rgba(99,102,241,0))] blur-3xl"
        animate={{ x: [0, -24, 0], y: [0, 18, 0], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
      <FeedHeader
        isForYouActive={isForYouSelected}
        isSubscribedActive={isSubscribedSelected}
        activeFilterCount={activeFilterCount}
        onSelectForYou={() => {
          setFeedMode("forYou");
          setSelectedOrgId(null);
        }}
        onSelectSubscribed={() => {
          setFeedMode("subscribed");
          setSelectedOrgId(null);
        }}
        onSelectTrending={() => {
          setFeedMode("trending");
          setSelectedOrgId(null);
        }}
        onSelectUpcoming={() => {
          setFeedMode("upcoming");
          setSelectedOrgId(null);
        }}
        activeMode={feedMode}
      />

      <div className="relative z-10 mx-auto w-full max-w-[1880px] px-3 py-4 sm:px-5 sm:py-6 lg:px-6 xl:h-[calc(100vh-4rem)] xl:px-8 xl:py-5 2xl:px-10">
        {organizations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08, ease: "easeOut" }}
            className="mt-4 lg:hidden"
          >
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              <Button
                variant={isForYouSelected ? "default" : "outline"}
                className="rounded-full border-white/50 bg-white/80 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur"
                onClick={() => {
                  setFeedMode("forYou");
                  setSelectedOrgId(null);
                }}
              >
                For You
              </Button>
              <Button
                variant={isSubscribedSelected ? "default" : "outline"}
                className="rounded-full border-white/50 bg-white/80 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur"
                onClick={() => {
                  setFeedMode("subscribed");
                  setSelectedOrgId(null);
                }}
              >
                Subscribed
              </Button>
              <Button
                variant={isTrendingSelected ? "default" : "outline"}
                className="rounded-full border-white/50 bg-white/80 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur"
                onClick={() => {
                  setFeedMode("trending");
                  setSelectedOrgId(null);
                }}
              >
                Trending
              </Button>
              <Button
                variant={isUpcomingSelected ? "default" : "outline"}
                className="rounded-full border-white/50 bg-white/80 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur"
                onClick={() => {
                  setFeedMode("upcoming");
                  setSelectedOrgId(null);
                }}
              >
                Upcoming
              </Button>
              {organizations.slice(0, 10).map((org) => (
                <Button
                  key={org._id}
                  variant={selectedOrgId === org._id && isForYouSelected ? "default" : "outline"}
                  className="rounded-full border-white/50 bg-white/80 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur"
                  onClick={() => {
                    setFeedMode("forYou");
                    setSelectedOrgId(org._id);
                  }}
                >
                  {org.name}
                </Button>
              ))}
            </div>
          </motion.div>
        )}

        <div className="flex flex-col gap-5 xl:h-full xl:flex-row xl:items-start xl:gap-5 xl:overflow-hidden 2xl:gap-6">
          <aside className="hidden h-full w-[320px] flex-shrink-0 xl:block 2xl:w-[360px]">
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.1, ease: "easeOut" }}
              className="h-full space-y-4 overflow-hidden"
            >
              <OrganizationFilter
                organizations={organizations}
                selectedId={isForYouSelected ? selectedOrgId : null}
                isAuthenticated={isAuthenticated}
                subscribedOrganizations={subscribedOrganizations}
                onSelect={(id) => {
                  setFeedMode("forYou");
                  setSelectedOrgId(id);
                }}
              />
            </motion.div>
          </aside>

          <main className="min-w-0 flex-1 xl:h-full xl:max-w-[860px] xl:overflow-y-auto xl:pr-2 no-scrollbar 2xl:max-w-[960px]">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.14, ease: "easeOut" }}
              className="mb-6 mt-4 lg:mt-6"
            >
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Refine results</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">
                    {isTrendingSelected
                      ? "Trending across campus"
                      : isUpcomingSelected
                      ? "Upcoming campus events"
                      : isSubscribedSelected
                      ? "Posts from organizations you follow"
                      : "Tune the feed in real time"}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="w-fit rounded-full border border-white/60 bg-white/70 px-3 py-1 text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
                    {isTrendingSelected
                      ? "Trending"
                      : isUpcomingSelected
                      ? "Upcoming"
                      : isSubscribedSelected
                      ? "Subscribed"
                      : "For You"}
                  </Badge>
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="w-fit rounded-full border border-white/60 bg-white/70 px-3 py-1 text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
                      {activeFilterCount} active
                    </Badge>
                  )}
                  {(selectedOrgId || activeFilterCount > 0 || feedMode !== "forYou") && (
                    <Button variant="outline" size="sm" className="rounded-full border-white/60 bg-white/80 shadow-[0_8px_18px_rgba(15,23,42,0.06)]" onClick={resetFeedView}>
                      Reset Feed
                    </Button>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto rounded-[1.75rem] border border-white/65 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(248,250,252,0.88))] px-4 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:overflow-visible">
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
                  <div key={i} className="overflow-hidden rounded-[1.75rem] border border-white/60 bg-white/90 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
                    <Skeleton className="aspect-square w-full" />
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

            {!isLoading && displayedEvents.length === 0 && (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Calendar />
                  </EmptyMedia>
                    <EmptyTitle>No events found</EmptyTitle>
                  <EmptyDescription>
                    {isSubscribedSelected && isAuthenticated
                      ? "Subscribe to organizations from any post to fill your subscribed feed."
                      : isForYouSelected && isAuthenticated
                      ? "For You is your campus-wide discovery feed. Subscribe to organizations to also build your Subscribed feed."
                      : selectedOrgId || Object.keys(filters).length > 0
                      ? "Try adjusting your filters or selecting a different organization."
                      : "Check back soon for upcoming campus events!"}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}

            {!isLoading && displayedEvents.length > 0 && (
              <div className="space-y-5 pb-6">
                {isForYouSelected && (
                  <section className="grid gap-4 lg:grid-cols-2">
                    <motion.div
                      whileHover={{ y: -4 }}
                      transition={{ duration: 0.22 }}
                      className="rounded-[1.75rem] border border-white/65 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.15),transparent_42%),linear-gradient(145deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Discovery</p>
                      <h3 className="mt-1 text-lg font-semibold">Trending organizations</h3>
                      <div className="mt-4 space-y-2">
                        {trendingOrganizations.slice(0, 4).map(([orgId, item], index) => (
                          <button
                            key={orgId}
                            type="button"
                            className="flex w-full items-center justify-between rounded-2xl border border-transparent bg-white/70 px-4 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-colors hover:border-primary/20 hover:bg-primary/5"
                            onClick={() => {
                              setFeedMode("forYou");
                              setSelectedOrgId(orgId);
                            }}
                          >
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-xs text-muted-foreground">#{index + 1} on campus right now</p>
                            </div>
                            <Badge variant="secondary" className="rounded-full px-3 py-1">
                              {item.score}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    </motion.div>

                    <motion.div
                      whileHover={{ y: -4 }}
                      transition={{ duration: 0.22 }}
                      className="rounded-[1.75rem] border border-white/65 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.16),transparent_40%),linear-gradient(145deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Next Moves</p>
                      <h3 className="mt-1 text-lg font-semibold">What to check next</h3>
                      <div className="mt-4 space-y-3">
                        {todayEvents.length > 0 && (
                          <div className="rounded-2xl bg-white/70 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                            <p className="text-sm font-medium">Happening today</p>
                            <p className="text-xs text-muted-foreground">{todayEvents.length} events are live on campus today</p>
                          </div>
                        )}
                        {registrationSoonEvents.length > 0 && (
                          <div className="rounded-2xl bg-white/70 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                            <p className="text-sm font-medium">Registration closing soon</p>
                            <p className="text-xs text-muted-foreground">
                              {registrationSoonEvents[0].title} and {Math.max(0, registrationSoonEvents.length - 1)} more are coming up soon
                            </p>
                          </div>
                        )}
                        {isAuthenticated && recommendedEvents.length > 0 && (
                          <div className="rounded-2xl bg-white/70 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                            <p className="text-sm font-medium">Because you subscribed to similar orgs</p>
                            <p className="text-xs text-muted-foreground">
                              {recommendedEvents[0].title} is recommended based on your branch and engagement
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </section>
                )}

                {isSubscribedSelected && isAuthenticated && (
                  <section className="space-y-4">
                    <div className="rounded-[1.75rem] border border-white/65 bg-[radial-gradient(circle_at_top_left,rgba(255,189,89,0.22),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(255,247,237,0.88))] p-5 shadow-[0_22px_60px_rgba(249,115,22,0.1)] backdrop-blur">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Subscribed Feed</p>
                      <h3 className="mt-1 text-xl font-semibold">Posts from organizations you subscribed to</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Subscribe from any event card and those posts will be collected here.
                      </p>
                      {subscribedOrganizations.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {subscribedOrganizations.map((org: any) => (
                            <Badge key={org._id} variant="secondary" className="rounded-full px-3 py-1">
                              {org.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {isForYouSelected && (
                  <section className="space-y-4">
                    <div className="rounded-[1.75rem] border border-white/65 bg-[radial-gradient(circle_at_top_left,rgba(129,140,248,0.18),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(243,244,255,0.88))] p-5 shadow-[0_22px_60px_rgba(99,102,241,0.1)] backdrop-blur">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">For You</p>
                      <h3 className="mt-1 text-xl font-semibold">Campus-wide discovery feed</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        This view keeps all posts visible. Organizations you subscribe to are separated into the `Subscribed` feed.
                      </p>
                    </div>
                  </section>
                )}

                {isTrendingSelected && trendingEvents.length > 0 && (
                  <section className="rounded-[1.75rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(248,250,252,0.9))] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Trending Events</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {trendingEvents.map((event) => (
                        <button
                          key={event._id}
                          type="button"
                          className="rounded-2xl border border-white/55 bg-white/75 px-4 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-colors hover:border-primary/20 hover:bg-primary/5"
                          onClick={() => {
                            setFeedMode("forYou");
                            setSelectedOrgId(null);
                            setSearchParams({ event: event._id });
                          }}
                        >
                          <p className="font-medium">{event.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {(event.upvoteCount || 0)} upvotes • {(event.commentCount || 0)} comments • {(event.rsvpCount || 0)} RSVPs
                          </p>
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {isUpcomingSelected && upcomingEvents.length > 0 && (
                  <section className="rounded-[1.75rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(248,250,252,0.9))] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Upcoming Highlights</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {upcomingEvents.slice(0, 4).map((event: any) => (
                        <button
                          key={event._id}
                          type="button"
                          className="rounded-2xl border border-white/55 bg-white/75 px-4 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-colors hover:border-primary/20 hover:bg-primary/5"
                          onClick={() => setSearchParams({ event: event._id })}
                        >
                          <p className="font-medium">{event.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(event.dateTime).toLocaleDateString()} • {event.organizationId?.name || "Organization"}
                          </p>
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {displayedEvents.map((event: any, index: number) => (
                  <motion.div
                    key={event._id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: Math.min(index * 0.025, 0.18) }}
                  >
                    <EventCard
                      event={{ ...event, recommended: false }}
                      adminOrgIds={adminOrgIds}
                      isSubscribed={subscribedOrgIds.includes(String(event.organizationId?._id || event.organizationId))}
                      onSubscriptionChange={handleSubscriptionChange}
                    />
                  </motion.div>
                ))}

                {canLoadMore && (
                  <div className="flex justify-center pt-4">
                    <Button variant="secondary" onClick={handleLoadMore} className="rounded-full border border-white/60 bg-white/80 px-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur">
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

          <aside className="hidden h-full w-[340px] flex-shrink-0 xl:block 2xl:w-[400px]">
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.18, ease: "easeOut" }}
              className="h-full space-y-5 overflow-y-auto pr-1 no-scrollbar"
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
