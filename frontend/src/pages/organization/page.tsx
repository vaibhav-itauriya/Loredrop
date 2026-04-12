import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Check, Layers, Loader2, Plus } from "lucide-react";
import EventCard from "../feed/_components/EventCard.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useAuth } from "@/hooks/use-auth.ts";
import { eventsAPI, organizationsAPI } from "@/lib/api";
import { getParentId } from "@/lib/org-hierarchy.ts";
import { toast } from "sonner";

type Org = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  type?: string;
  logo?: string;
  coverImage?: string;
  followerCount?: number;
  parentOrganizationId?: string | { _id?: string };
};

export default function OrganizationPage() {
  const { slug } = useParams();
  const { isAuthenticated } = useAuth();
  const [organization, setOrganization] = useState<Org | null>(null);
  const [allOrganizations, setAllOrganizations] = useState<Org[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowActionLoading, setIsFollowActionLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscribedOrgIds, setSubscribedOrgIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    const fetchOrganizationData = async () => {
      if (!slug) return;
      setLoading(true);
      try {
        const org = await organizationsAPI.getBySlug(slug);
        const [allOrgs, orgEvents, subscriptions] = await Promise.all([
          organizationsAPI.list(),
          eventsAPI.getByOrganization(org._id),
          isAuthenticated ? organizationsAPI.getMySubscriptions().catch(() => []) : Promise.resolve([]),
        ]);
        const subscriptionIds = new Set<string>(
          Array.isArray(subscriptions)
            ? subscriptions.map((item: any) => String(item?._id)).filter(Boolean)
            : []
        );
        const isOrgFollowed = isAuthenticated && subscriptionIds.has(String(org._id));

        if (!cancelled) {
          setOrganization(org);
          setAllOrganizations(allOrgs);
          setEvents(Array.isArray(orgEvents) ? orgEvents : []);
          setIsFollowing(isOrgFollowed);
          setSubscribedOrgIds(subscriptionIds);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load organization page:", error);
          toast.error("Failed to load organization details");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchOrganizationData();
    return () => {
      cancelled = true;
    };
  }, [slug, isAuthenticated]);

  const handleToggleFollow = async () => {
    if (!organization?._id) return;
    if (!isAuthenticated) {
      toast.error("Please sign in to follow organizations");
      return;
    }

    try {
      setIsFollowActionLoading(true);
      if (isFollowing) {
        const response = await organizationsAPI.unsubscribeFromOrganization(organization._id);
        setIsFollowing(false);
        setSubscribedOrgIds((prev) => {
          const next = new Set(prev);
          next.delete(String(organization._id));
          return next;
        });
        setOrganization((prev) =>
          prev
            ? {
                ...prev,
                followerCount:
                  typeof response?.followerCount === "number" ? response.followerCount : prev.followerCount,
              }
            : prev,
        );
        toast.success(`Unfollowed ${organization.name}`);
      } else {
        const response = await organizationsAPI.subscribeToOrganization(organization._id);
        setIsFollowing(true);
        setSubscribedOrgIds((prev) => {
          const next = new Set(prev);
          next.add(String(organization._id));
          return next;
        });
        setOrganization((prev) =>
          prev
            ? {
                ...prev,
                followerCount:
                  typeof response?.followerCount === "number" ? response.followerCount : prev.followerCount,
              }
            : prev,
        );
        toast.success(`Following ${organization.name}`);
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to update follow status");
    } finally {
      setIsFollowActionLoading(false);
    }
  };

  const now = new Date();
  const upcomingEvents = useMemo(
    () => events.filter((event) => new Date(event.dateTime) >= now),
    [events, now],
  );

  const parentOrg = useMemo(() => {
    if (!organization) return null;
    const parentId = getParentId(organization as any);
    if (!parentId) return null;
    return allOrganizations.find((org) => org._id === parentId) || null;
  }, [organization, allOrganizations]);

  const childClubs = useMemo(() => {
    if (!organization || organization.type !== "council") return [];
    return allOrganizations.filter((org) => {
      const parentId = getParentId(org as any);
      return org.type === "club" && parentId === organization._id;
    });
  }, [organization, allOrganizations]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
          <Skeleton className="h-10 w-60" />
          <Skeleton className="h-52 w-full rounded-2xl" />
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <p className="text-muted-foreground">Organization not found.</p>
          <Link to="/feed">
            <Button variant="outline" className="mt-4">Back to Feed</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link to="/feed">
          <Button variant="ghost" className="mb-4 pl-0">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to feed
          </Button>
        </Link>

        <Card className="overflow-hidden border-border/60">
          <div
            className="h-32 sm:h-40 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/10"
            style={organization.coverImage ? { backgroundImage: `url(${organization.coverImage})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
          />
          <div className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-16 h-16 rounded-2xl border border-border/60 bg-background overflow-hidden flex items-center justify-center">
                {organization.logo ? (
                  <img src={organization.logo} alt={organization.name} className="w-full h-full object-cover" />
                ) : (
                  <Layers className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold truncate" style={{ fontFamily: "var(--font-display)" }}>
                  {organization.name}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge variant="secondary" className="capitalize">{organization.type || "organization"}</Badge>
                  {parentOrg && (
                    <Link to={`/organizations/${parentOrg.slug}`}>
                      <Badge variant="outline">Under {parentOrg.name}</Badge>
                    </Link>
                  )}
                </div>
              </div>
              <div className="sm:ml-auto">
                <Button
                  onClick={handleToggleFollow}
                  disabled={isFollowActionLoading}
                  className="rounded-full px-5"
                  variant={isFollowing ? "secondary" : "default"}
                >
                  {isFollowActionLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : isFollowing ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Following
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Follow
                    </>
                  )}
                </Button>
              </div>
            </div>

            {organization.description && (
              <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
                {organization.description}
              </p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Total Events</p>
                <p className="text-xl font-semibold mt-1">{events.length}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Upcoming</p>
                <p className="text-xl font-semibold mt-1">{upcomingEvents.length}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3 col-span-2 sm:col-span-1">
                <p className="text-xs text-muted-foreground">Slug</p>
                <p className="text-sm font-medium mt-1 break-all">{organization.slug}</p>
              </div>
            </div>
          </div>
        </Card>

        {childClubs.length > 0 && (
          <Card className="mt-4 p-4 border-border/60">
            <p className="text-sm font-semibold mb-3">Associated Clubs</p>
            <div className="flex flex-wrap gap-2">
              {childClubs.map((club) => (
                <Link key={club._id} to={`/organizations/${club.slug}`}>
                  <Badge variant="outline">{club.name}</Badge>
                </Link>
              ))}
            </div>
          </Card>
        )}

        <div className="mt-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-4 h-4 text-primary" />
            <h2 className="text-lg font-semibold">Events</h2>
          </div>
          {events.length === 0 ? (
            <Card className="p-6 border-border/60 text-sm text-muted-foreground">
              No events posted yet by this {organization.type || "organization"}.
            </Card>
          ) : (
            <div className="space-y-5">
              {events.map((event) => (
                <EventCard
                  key={event._id}
                  event={event}
                  isSubscribed={subscribedOrgIds.has(String(event.organizationId?._id || event.organizationId))}
                  onSubscriptionChange={(organizationId, subscribed) => {
                    setSubscribedOrgIds((prev) => {
                      const next = new Set(prev);
                      if (subscribed) next.add(String(organizationId));
                      else next.delete(String(organizationId));
                      return next;
                    });
                    if (organization && String(organization._id) === String(organizationId)) {
                      setIsFollowing(subscribed);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
