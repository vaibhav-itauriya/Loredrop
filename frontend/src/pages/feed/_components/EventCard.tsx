import { format, isPast, isToday, isTomorrow } from "date-fns";
import { useState, useEffect, useMemo, memo } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel.tsx";
import { Dialog, DialogContent } from "@/components/ui/dialog.tsx";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  ArrowUp,
  Bookmark,
  MessageCircle,
  Calendar,
  Clock3,
  MapPin,
  ExternalLink,
  Share2,
  MoreHorizontal,
  Link2,
  Building2,
  FileDown,
  Plus,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { eventsAPI, interactionsAPI, organizationsAPI } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth.ts";
import EventEditDialog from "@/components/EventEditDialog.tsx";

type EventCardProps = {
  event: any;
  isSubscribed?: boolean;
  adminOrgIds?: string[];
  onSubscriptionChange?: (organizationId: string, subscribed: boolean) => void;
};

function getEventDateLabel(dateTime: string): string {
  const date = new Date(dateTime);
  if (isPast(date)) return "Past";
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "MMM d");
}

function getEventTimeDisplay(dateTime: string): string {
  const date = new Date(dateTime);
  return format(date, "h:mm a");
}

function getCoverInitials(label?: string): string {
  return (label || "LoreDrop")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "LD";
}

const audienceLabels: Record<string, string> = {
  ug: "UG",
  pg: "PG",
  phd: "PhD",
  faculty: "Faculty",
  staff: "Staff",
  all: "Everyone",
};

function EventCard({
  event,
  isSubscribed = false,
  adminOrgIds = [],
  onSubscriptionChange,
}: EventCardProps) {
  const { isAuthenticated, user } = useAuth();
  const [localEvent, setLocalEvent] = useState(event);
  const [hasUpvoted, setHasUpvoted] = useState(event.hasUpvoted || false);
  const [upvoteCount, setUpvoteCount] = useState(event.upvoteCount || 0);
  const [hasCalendarSave, setHasCalendarSave] = useState(event.hasCalendarSave || false);
  const [commentCount, setCommentCount] = useState(event.commentCount || 0);
  const [comments, setComments] = useState<any[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(isSubscribed);
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [loadedMedia, setLoadedMedia] = useState<Record<string, boolean>>({});
  const [mediaCarouselApi, setMediaCarouselApi] = useState<any>(null);
  const [mediaDialogCarouselApi, setMediaDialogCarouselApi] = useState<any>(null);

  useEffect(() => {
    setLocalEvent(event);
    setHasUpvoted(event.hasUpvoted || false);
    setUpvoteCount(event.upvoteCount || 0);
    setHasCalendarSave(event.hasCalendarSave || false);
    setCommentCount(event.commentCount || 0);
  }, [event]);

  useEffect(() => {
    setSubscribed(isSubscribed);
  }, [isSubscribed]);

  useEffect(() => {
    if (!mediaCarouselApi) return;

    const syncSelectedIndex = () => {
      setSelectedMediaIndex(mediaCarouselApi.selectedScrollSnap());
    };

    syncSelectedIndex();
    mediaCarouselApi.on("select", syncSelectedIndex);
    mediaCarouselApi.on("reInit", syncSelectedIndex);

    return () => {
      mediaCarouselApi.off("select", syncSelectedIndex);
    };
  }, [mediaCarouselApi]);

  useEffect(() => {
    if (!mediaDialogCarouselApi || !mediaDialogOpen) return;

    mediaDialogCarouselApi.scrollTo(selectedMediaIndex);

    const syncSelectedIndex = () => {
      setSelectedMediaIndex(mediaDialogCarouselApi.selectedScrollSnap());
    };

    mediaDialogCarouselApi.on("select", syncSelectedIndex);
    mediaDialogCarouselApi.on("reInit", syncSelectedIndex);

    return () => {
      mediaDialogCarouselApi.off("select", syncSelectedIndex);
    };
  }, [mediaDialogCarouselApi, mediaDialogOpen, selectedMediaIndex]);

  useEffect(() => {
    if (!showComments) return;

    let cancelled = false;
    const fetch = async () => {
      try {
        const data = await interactionsAPI.getComments(localEvent._id);
        if (!cancelled) {
          setComments(data);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch comments:", error);
        }
      }
    };

    fetch();

    return () => {
      cancelled = true;
    };
  }, [localEvent._id, showComments]);

  const handleUpvote = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to upvote");
      return;
    }

    try {
      setIsLoading(true);
      await interactionsAPI.toggleUpvote(localEvent._id);

      if (!hasUpvoted) {
        setUpvoteCount(upvoteCount + 1);
        toast.success("Liked!");
      } else {
        setUpvoteCount(upvoteCount - 1);
        toast.success("Removed like");
      }

      setHasUpvoted(!hasUpvoted);
    } catch (error: any) {
      console.error("Failed to upvote:", error);
      toast.error("Failed to upvote event");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalendarSave = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to save to calendar");
      return;
    }

    try {
      setIsLoading(true);
      await interactionsAPI.toggleCalendarSave(localEvent._id);
      setHasCalendarSave(!hasCalendarSave);
      window.dispatchEvent(new CustomEvent("calendar-save-updated"));
      toast.success(hasCalendarSave ? "Removed from calendar" : "Added to calendar");
    } catch (error) {
      console.error("Failed to save to calendar:", error);
      toast.error("Failed to save to calendar");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToGoogleCalendar = () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to add to Google Calendar");
      return;
    }

    const startTime = new Date(localEvent.dateTime).toISOString().replace(/[-:]/g, "").split(".")[0];
    const endTime = localEvent.endDateTime
      ? new Date(localEvent.endDateTime).toISOString().replace(/[-:]/g, "").split(".")[0]
      : new Date(new Date(localEvent.dateTime).getTime() + 60 * 60 * 1000).toISOString().replace(/[-:]/g, "").split(".")[0];

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      localEvent.title
    )}&dates=${startTime}/${endTime}&details=${encodeURIComponent(
      localEvent.description
    )}&location=${encodeURIComponent(localEvent.venue)}&sf=true`;

    window.open(googleCalendarUrl, "_blank");
    toast.success("Opening Google Calendar...");
  };

  const handleDownloadIcs = () => {
    window.open(eventsAPI.getEventIcsUrl(localEvent._id), "_blank");
    toast.success("Downloading calendar file...");
  };

  const eventUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/feed?event=${localEvent._id}`
      : `/feed?event=${localEvent._id}`;

  const handleCopyEventLink = async () => {
    try {
      await navigator.clipboard.writeText(eventUrl);
      toast.success("Event link copied");
    } catch {
      toast.error("Failed to copy event link");
    }
  };

  const handleShareEvent = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: localEvent.title,
          text: localEvent.description,
          url: eventUrl,
        });
      } else {
        await handleCopyEventLink();
      }
    } catch {
      // Ignore cancelled native share dialogs.
    }
  };

  const handleOpenOrganization = () => {
    if (!org?.slug) return;
    window.location.href = `/organizations/${org.slug}`;
  };

  const handleOpenRegistration = () => {
    if (!localEvent.registrationLink) return;
    window.open(localEvent.registrationLink, "_blank", "noopener,noreferrer");
  };

  const handleToggleSubscription = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to subscribe to organizations");
      return;
    }
    if (!org?._id) return;

    try {
      if (subscribed) {
        await organizationsAPI.unsubscribeFromOrganization(String(org._id));
        setSubscribed(false);
        onSubscriptionChange?.(String(org._id), false);
        toast.success(`Unsubscribed from ${org?.name || "organization"}`);
      } else {
        await organizationsAPI.subscribeToOrganization(String(org._id));
        setSubscribed(true);
        onSubscriptionChange?.(String(org._id), true);
        toast.success(`Subscribed to ${org?.name || "organization"}`);
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to update subscription");
    }
  };

  const handleAddComment = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to comment");
      return;
    }

    if (commentText.trim().length === 0) {
      toast.error("Comment cannot be empty");
      return;
    }

    try {
      setIsLoading(true);
      await interactionsAPI.addComment(localEvent._id, commentText);
      setCommentText("");
      const data = await interactionsAPI.getComments(localEvent._id);
      setComments(data);
      setCommentCount((prev: number) => prev + 1);
      setLocalEvent((prev: any) => ({ ...prev, commentCount: (prev.commentCount || 0) + 1 }));
      toast.success("Comment added!");
    } catch (error) {
      console.error("Failed to add comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setIsLoading(false);
    }
  };

  const org = useMemo(() => localEvent.organizationId, [localEvent.organizationId]);
  const author = useMemo(() => localEvent.authorId, [localEvent.authorId]);
  const mediaItems = useMemo(() => {
    if (Array.isArray(localEvent.media) && localEvent.media.length > 0) {
      return localEvent.media.map((item: any, index: number) => ({
        kind: "media" as const,
        url:
          item?.url || "",
        alt: item?.alt || `${localEvent.title} media ${index + 1}`,
      }));
    }
    return [
      {
        kind: "fallback" as const,
        url: "",
        alt: localEvent.title,
      },
    ];
  }, [localEvent.media, localEvent.title]);

  const eventDateLabel = useMemo(() => getEventDateLabel(localEvent.dateTime), [localEvent.dateTime]);
  const eventTimeDisplay = useMemo(() => getEventTimeDisplay(localEvent.dateTime), [localEvent.dateTime]);
  const audienceDisplay = useMemo(() => {
    return localEvent.audience?.map((a: string) => audienceLabels[a]).join(", ") || "Everyone";
  }, [localEvent.audience]);
  const hasFallbackMedia = mediaItems[0]?.kind === "fallback";

  const canEditEvent =
    !!user?._id &&
    (
      String(author?._id || author?.id || "") === String(user._id) ||
      (!!org?._id && adminOrgIds.includes(String(org._id)))
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      whileHover={{ y: -4 }}
    >
      <Card
        data-event-id={localEvent._id}
        className="group overflow-hidden rounded-[1.75rem] border border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.97),rgba(248,250,252,0.92))] shadow-[0_18px_50px_rgba(15,23,42,0.08)] ring-1 ring-slate-950/[0.03] backdrop-blur-xl transition-all duration-300 hover:border-primary/20 hover:shadow-[0_26px_70px_rgba(15,23,42,0.14)]"
      >
        <div className={`relative w-full overflow-hidden bg-[linear-gradient(180deg,rgba(226,232,240,0.5),rgba(203,213,225,0.28))] ${hasFallbackMedia ? "aspect-square" : ""}`}>
          <Carousel
            opts={{ loop: mediaItems.length > 1 }}
            className={hasFallbackMedia ? "h-full w-full [&_[data-slot=carousel-content]]:h-full [&_[data-slot=carousel-item]]:h-full" : "w-full"}
            setApi={setMediaCarouselApi}
          >
            <CarouselContent className={`ml-0 ${hasFallbackMedia ? "h-full items-stretch" : ""}`}>
              {mediaItems.map((media: any, index: number) => (
                <CarouselItem key={`${localEvent._id}-media-${index}`} className={`pl-0 ${media.kind === "fallback" ? "basis-full h-full" : ""}`}>
                  <button
                    type="button"
                    className={`relative block w-full overflow-hidden ${media.kind === "fallback" ? "h-full min-h-full" : ""}`}
                    onClick={() => {
                      setSelectedMediaIndex(index);
                      setMediaDialogOpen(true);
                    }}
                  >
                    {media.kind === "fallback" ? (
                      <div className="relative grid h-full min-h-full w-full grid-rows-[auto_1fr_auto] overflow-hidden bg-[linear-gradient(140deg,#17324d_0%,#0e7490_45%,#f97316_100%)] p-6 text-left">
                        <motion.div
                          aria-hidden="true"
                          className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-white/14 blur-2xl"
                          animate={{ x: [0, 22, 0], y: [0, -14, 0], scale: [1, 1.08, 1] }}
                          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <motion.div
                          aria-hidden="true"
                          className="absolute -right-10 bottom-0 h-52 w-52 rounded-full bg-black/20 blur-3xl"
                          animate={{ x: [0, -18, 0], y: [0, 16, 0], scale: [1.04, 1, 1.05] }}
                          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <motion.div
                          aria-hidden="true"
                          className="absolute left-[12%] top-[34%] h-24 w-[76%] rounded-full border border-white/10 bg-white/8 blur-xl"
                          animate={{ x: [0, 18, 0], opacity: [0.45, 0.75, 0.45] }}
                          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_42%),linear-gradient(to_top,rgba(15,23,42,0.68),rgba(15,23,42,0.1))]" />
                        <div className="relative z-10 flex items-start justify-between gap-4">
                          <p className="max-w-[70%] text-[10px] font-semibold uppercase tracking-[0.34em] text-white/72">
                            {org?.name || "Campus Event"}
                          </p>
                          <div className="rounded-full border border-white/20 bg-white/12 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-white/80 backdrop-blur-sm">
                            {getCoverInitials(localEvent.title || org?.name)}
                          </div>
                        </div>
                        <div className="relative z-10 flex min-h-0 items-center">
                          <div className="max-w-[88%]">
                            <motion.p
                              className="text-xs uppercase tracking-[0.42em] text-white/60"
                              animate={{ x: [0, 10, 0] }}
                              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                            >
                              LIVE DROP
                            </motion.p>
                            <h3
                              className="mt-3 line-clamp-4 text-[2.35rem] font-semibold leading-[0.95] text-white sm:text-[2.8rem]"
                              style={{ fontFamily: "var(--font-display)" }}
                            >
                              {localEvent.title}
                            </h3>
                            <p className="mt-4 max-w-md text-sm leading-6 text-white/78">
                              {localEvent.description || "A fresh drop from your community feed."}
                            </p>
                          </div>
                        </div>
                        <div className="relative z-10 flex items-end justify-between gap-4">
                          <div className="rounded-2xl border border-white/14 bg-black/12 px-4 py-3 backdrop-blur-sm">
                            <p className="text-[10px] uppercase tracking-[0.28em] text-white/58">
                              Format
                            </p>
                            <p className="mt-1 text-sm font-medium text-white">
                              {localEvent.mode || "Event"}
                            </p>
                          </div>
                          <p className="text-right text-xs uppercase tracking-[0.28em] text-white/56">
                            {audienceDisplay}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {!loadedMedia[media.url] && (
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.48),rgba(148,163,184,0.14))]" />
                        )}
                        <img
                          src={media.url}
                          alt={media.alt}
                          className={`block w-full transition duration-700 group-hover:scale-[1.015] ${
                            loadedMedia[media.url] ? "h-auto scale-100 blur-0" : "h-auto scale-[1.01] blur-xl"
                          }`}
                          loading="lazy"
                          decoding="async"
                          onLoad={() =>
                            setLoadedMedia((prev) => ({ ...prev, [media.url]: true }))
                          }
                        />
                      </>
                    )}
                  </button>
                </CarouselItem>
              ))}
            </CarouselContent>
            {mediaItems.length > 1 && (
              <>
                <CarouselPrevious className="left-3 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full border-white/30 bg-black/35 text-white hover:bg-black/55" />
                <CarouselNext className="right-3 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full border-white/30 bg-black/35 text-white hover:bg-black/55" />
              </>
            )}
          </Carousel>
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(15,23,42,0.72),rgba(15,23,42,0.08)_42%,rgba(255,255,255,0.02))]" />
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            {localEvent.recommended && (
              <Badge className="rounded-full border border-amber-200/70 bg-amber-300/90 px-3 py-1 text-[11px] font-semibold text-amber-950 shadow-[0_8px_20px_rgba(245,158,11,0.24)] backdrop-blur-sm">
                For You
              </Badge>
            )}
            <Badge className="rounded-full border border-white/70 bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-900 shadow-[0_8px_18px_rgba(15,23,42,0.12)] backdrop-blur-sm">
              {eventDateLabel}
            </Badge>
            <Badge variant="secondary" className="rounded-full border border-white/20 bg-primary/85 px-3 py-1 text-[11px] font-semibold text-primary-foreground shadow-[0_10px_24px_rgba(99,102,241,0.24)]">
              {localEvent.mode}
            </Badge>
          </div>
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/72">Next up</p>
              <p className="mt-1 text-[1.15rem] font-semibold text-white">{eventTimeDisplay}</p>
            </div>
            <div className="rounded-full border border-white/20 bg-black/25 px-3 py-1 text-[11px] font-medium text-white shadow-[0_8px_20px_rgba(15,23,42,0.18)]">
              {format(new Date(localEvent.dateTime), "MMM d, yyyy")}
            </div>
          </div>
          {mediaItems.length > 1 && (
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/30 px-3 py-1">
              {mediaItems.map((_: any, index: number) => (
                <span
                  key={`${localEvent._id}-indicator-${index}`}
                  className={`h-1.5 rounded-full ${index === selectedMediaIndex ? "w-5 bg-white" : "w-1.5 bg-white/50"}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-0">
          <div className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex items-start gap-3">
                {org?.slug ? (
                  <Link to={`/organizations/${org.slug}`} className="flex min-w-0 items-start gap-3 group">
                    <Avatar className="h-12 w-12 rounded-full border border-white/70 shadow-[0_10px_24px_rgba(15,23,42,0.08)] ring-1 ring-slate-950/[0.03]">
                      <AvatarImage src={author?.avatar || org?.logo} alt={author?.displayName || org?.name} />
                      <AvatarFallback className="rounded-full">
                        {(author?.displayName || author?.name || org?.name || "L").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="truncate text-[1.02rem] font-semibold tracking-[-0.01em] text-slate-950 group-hover:text-primary transition-colors">
                          {org?.name || "Unknown Organization"}
                        </p>
                        {localEvent.recommended && (
                          <Badge className="rounded-full border border-amber-200/70 bg-amber-300/85 px-2.5 py-0.5 text-[10px] font-semibold text-amber-950 shadow-sm">
                            Recommended
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">
                        {author?.name || author?.displayName || "Unknown Author"}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span>{format(new Date(localEvent.dateTime), "MMM d, yyyy")}</span>
                        <span>•</span>
                        <span>{eventTimeDisplay}</span>
                        <span>•</span>
                        <span>{audienceDisplay}</span>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <>
                    <Avatar className="h-12 w-12 rounded-full border border-white/70 shadow-[0_10px_24px_rgba(15,23,42,0.08)] ring-1 ring-slate-950/[0.03]">
                      <AvatarImage src={author?.avatar || org?.logo} alt={author?.displayName || org?.name} />
                      <AvatarFallback className="rounded-full">
                        {(author?.displayName || author?.name || org?.name || "L").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="truncate text-[1.02rem] font-semibold tracking-[-0.01em] text-slate-950">
                          {org?.name || "Unknown Organization"}
                        </p>
                        {localEvent.recommended && (
                          <Badge className="rounded-full border border-amber-200/70 bg-amber-300/85 px-2.5 py-0.5 text-[10px] font-semibold text-amber-950 shadow-sm">
                            Recommended
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">
                        {author?.name || author?.displayName || "Unknown Author"}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span>{format(new Date(localEvent.dateTime), "MMM d, yyyy")}</span>
                        <span>•</span>
                        <span>{eventTimeDisplay}</span>
                        <span>•</span>
                        <span>{audienceDisplay}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={subscribed ? "secondary" : "outline"}
                  size="sm"
                  className={`rounded-full border px-4 shadow-sm transition-all ${
                    subscribed
                      ? "border-primary/15 bg-primary/10 text-primary hover:bg-primary/14"
                      : "border-slate-200 bg-white/85 hover:border-primary/20 hover:bg-primary/5"
                  }`}
                  onClick={handleToggleSubscription}
                >
                  {subscribed ? (
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full border border-transparent text-slate-500 transition-all hover:border-slate-200 hover:bg-white hover:text-slate-900"
                      aria-label="More options"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-2xl border-white/70 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] backdrop-blur-xl">
                    <DropdownMenuItem onClick={handleShareEvent} className="gap-2">
                      <Share2 className="w-4 h-4" />
                      Share Event
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopyEventLink} className="gap-2">
                      <Link2 className="w-4 h-4" />
                      Copy Event Link
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowComments(true)} className="gap-2">
                      <MessageCircle className="w-4 h-4" />
                      View Comments
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleCalendarSave} disabled={isLoading || !isAuthenticated} className="gap-2">
                      <Bookmark className="w-4 h-4" />
                      {hasCalendarSave ? "Remove from My Calendar" : "Save to My Calendar"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleAddToGoogleCalendar} disabled={!isAuthenticated} className="gap-2">
                      <Calendar className="w-4 h-4" />
                      Add to Google Calendar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadIcs} className="gap-2">
                      <FileDown className="w-4 h-4" />
                      Download .ics File
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleOpenOrganization} disabled={!org?.slug} className="gap-2">
                      <Building2 className="w-4 h-4" />
                      View Organization
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleOpenRegistration} disabled={!localEvent.registrationLink} className="gap-2">
                      <ExternalLink className="w-4 h-4" />
                      Open Registration
                    </DropdownMenuItem>
                    {canEditEvent && (
                      <>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1">
                          <EventEditDialog
                            event={localEvent}
                            canEdit={canEditEvent}
                            compact
                            triggerClassName="w-full justify-start px-2"
                            onUpdated={(updated) => setLocalEvent((prev: any) => ({ ...prev, ...updated }))}
                          />
                        </div>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <h3 className="text-[1.38rem] font-semibold leading-[1.02] tracking-[-0.02em] text-slate-950 sm:text-[1.52rem]" style={{ fontFamily: "var(--font-display)" }}>
                {localEvent.title}
              </h3>
              <p className="line-clamp-3 text-[15px] leading-6 text-slate-700">
                {localEvent.description}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <Badge variant="outline" className="rounded-full border-primary/10 bg-primary/[0.07] px-3 py-1 font-medium text-primary shadow-sm">
                  {eventDateLabel}
                </Badge>
                <Badge variant="outline" className="rounded-full border-slate-200/90 bg-white/75 px-3 py-1 font-medium text-slate-700 shadow-sm">
                  {localEvent.mode}
                </Badge>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {localEvent.venue}
                </span>
              </div>
              {localEvent.tags && localEvent.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {localEvent.tags.slice(0, 3).map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="rounded-full border border-white/70 bg-slate-100/90 px-3 py-1 text-[11px] font-medium text-slate-700 shadow-sm">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="border-y border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.8),rgba(241,245,249,0.72))] px-4 py-3 text-sm text-slate-500 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold text-slate-900">{upvoteCount} likes</span>
                <span>{commentCount} comments</span>
                <span>{hasCalendarSave ? "Saved to your calendar" : "Not saved yet"}</span>
              </div>
              {localEvent.registrationLink && (
                <Button size="sm" className="rounded-full border border-primary/15 bg-primary/95 px-4 text-white shadow-[0_12px_28px_rgba(99,102,241,0.24)] hover:bg-primary/90" asChild>
                  <a href={localEvent.registrationLink} target="_blank" rel="noopener noreferrer">
                    Learn More
                    <ExternalLink className="ml-2 h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5 p-2.5 sm:p-3">
            <Button
              variant="ghost"
              className={`h-11 rounded-[1rem] border transition-all ${hasUpvoted ? "border-primary/15 bg-primary/10 text-primary shadow-sm" : "border-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-900"}`}
              onClick={handleUpvote}
              disabled={isLoading}
            >
              <ArrowUp className="mr-2 h-4 w-4" />
              Like
            </Button>
            <Button
              variant="ghost"
              className="h-11 rounded-[1rem] border border-transparent text-slate-500 transition-all hover:border-slate-200 hover:bg-white hover:text-slate-900"
              onClick={() => setShowComments(true)}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Comment
            </Button>
            <Button
              variant="ghost"
              className={`h-11 rounded-[1rem] border transition-all ${hasCalendarSave ? "border-primary/15 bg-primary/10 text-primary shadow-sm" : "border-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-900"}`}
              onClick={handleCalendarSave}
              disabled={isLoading}
              title="Add to calendar"
            >
              <Bookmark className="mr-2 h-4 w-4" />
              Save
            </Button>
            <Button
              variant="ghost"
              className="h-11 rounded-[1rem] border border-transparent text-slate-500 transition-all hover:border-slate-200 hover:bg-white hover:text-slate-900"
              onClick={handleShareEvent}
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>

          <div className="px-4 pb-4 sm:px-5 sm:pb-5">
            <button
              type="button"
              className="w-full rounded-[1.2rem] border border-white/70 bg-[linear-gradient(145deg,rgba(248,250,252,0.95),rgba(241,245,249,0.92))] p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-all hover:border-primary/15 hover:bg-white"
              onClick={() => setShowComments(true)}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Conversation
                  </p>
                  <p className="mt-1 text-sm text-slate-900">
                    {comments.length > 0 ? comments[0]?.text : "Be the first to drop a quick note on this event."}
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-3 py-1 text-sm text-slate-500 shadow-sm">
                  <MessageCircle className="h-4 w-4" />
                  <span>{commentCount}</span>
                </div>
              </div>
              {comments.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {comments[0]?.userId?.name || comments[0]?.userId?.displayName || "Community member"} said this most recently
                </p>
              )}
            </button>
          </div>
        </div>
      </Card>

      <Dialog open={mediaDialogOpen} onOpenChange={setMediaDialogOpen}>
        <DialogContent className="max-w-5xl border-white/10 bg-slate-950 p-0 text-white sm:rounded-[1.75rem]">
          <div className="grid gap-0 overflow-hidden sm:grid-cols-[minmax(0,1fr)_320px]">
            <div className="relative min-h-[60vh] bg-black">
              <Carousel
                opts={{ loop: mediaItems.length > 1, startIndex: selectedMediaIndex }}
                className="h-full w-full"
                setApi={setMediaDialogCarouselApi}
              >
                <CarouselContent className="ml-0 h-full">
                  {mediaItems.map((media: any, index: number) => (
                    <CarouselItem key={`${localEvent._id}-dialog-media-${index}`} className="pl-0">
                      <div className="flex h-[60vh] items-center justify-center bg-black sm:h-[78vh]">
                        {media.kind === "fallback" ? (
                          <div className="relative flex h-full w-full items-end overflow-hidden bg-[linear-gradient(140deg,#17324d_0%,#0e7490_45%,#f97316_100%)] p-8 sm:p-12">
                            <motion.div
                              aria-hidden="true"
                              className="absolute left-10 top-10 h-48 w-48 rounded-full bg-white/14 blur-3xl"
                              animate={{ x: [0, 24, 0], y: [0, -16, 0] }}
                              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
                            />
                            <motion.div
                              aria-hidden="true"
                              className="absolute bottom-6 right-6 h-64 w-64 rounded-full bg-slate-950/28 blur-3xl"
                              animate={{ x: [0, -18, 0], y: [0, 20, 0] }}
                              transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
                            />
                            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(2,6,23,0.78),rgba(2,6,23,0.12))]" />
                            <div className="relative z-10 max-w-2xl">
                              <p className="text-xs font-semibold uppercase tracking-[0.36em] text-white/70">
                                {org?.name || "Campus Event"}
                              </p>
                              <h3
                                className="mt-4 text-4xl font-semibold leading-tight text-white sm:text-6xl"
                                style={{ fontFamily: "var(--font-display)" }}
                              >
                                {localEvent.title}
                              </h3>
                              <p className="mt-4 max-w-xl text-base leading-7 text-white/80">
                                {localEvent.description || "A fresh drop from your community feed."}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={media.url}
                            alt={media.alt}
                            className="h-full w-full object-contain"
                          />
                        )}
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {mediaItems.length > 1 && (
                  <>
                    <CarouselPrevious className="left-4 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20" />
                    <CarouselNext className="right-4 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20" />
                  </>
                )}
              </Carousel>
            </div>
            <div className="flex flex-col gap-5 bg-slate-950/95 p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Gallery
                </p>
                <h3 className="mt-2 text-2xl font-semibold">{localEvent.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  {localEvent.description}
                </p>
              </div>
              <div className="space-y-3 rounded-[1.25rem] border border-white/10 bg-white/5 p-4 text-sm text-white/75">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4" />
                  <span>{format(new Date(localEvent.dateTime), "EEE, MMM d • h:mm a")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{localEvent.venue}</span>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {mediaItems.map((media: any, index: number) => (
                  <button
                    key={`${localEvent._id}-thumb-${index}`}
                    type="button"
                    className={`overflow-hidden rounded-2xl border ${
                      index === selectedMediaIndex ? "border-white/70" : "border-white/10"
                    }`}
                    onClick={() => setSelectedMediaIndex(index)}
                  >
                    {media.kind === "fallback" ? (
                      <div className="flex aspect-square w-full items-end bg-[linear-gradient(140deg,#17324d_0%,#0e7490_45%,#f97316_100%)] p-3 text-left">
                        <div>
                          <p className="text-[9px] uppercase tracking-[0.28em] text-white/65">
                            {org?.name || "Event"}
                          </p>
                          <p className="mt-1 line-clamp-3 text-xs font-semibold leading-4 text-white">
                            {localEvent.title}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={media.url}
                        alt={media.alt}
                        className="aspect-square w-full object-cover"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={showComments} onOpenChange={setShowComments}>
        <SheetContent side="bottom" className="mx-auto h-[82vh] max-w-3xl rounded-t-[2rem] px-0">
          <SheetHeader className="px-5 pb-4 pt-2 text-left">
            <SheetTitle className="text-xl">Comments</SheetTitle>
            <SheetDescription>
              Join the conversation around {localEvent.title}.
            </SheetDescription>
          </SheetHeader>
          <div className="flex h-[calc(82vh-96px)] flex-col">
            <div className="space-y-3 overflow-y-auto px-5 pb-4">
              {comments.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-border/70 bg-muted/30 px-4 py-8 text-center">
                  <p className="text-sm font-medium text-foreground">No comments yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Start the thread with a quick reaction or question.
                  </p>
                </div>
              ) : (
                comments.map((comment: any) => (
                  <div key={comment._id} className="rounded-[1.25rem] border border-border/60 bg-muted/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {comment.userId?.name || comment.userId?.displayName || "Community member"}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{comment.text}</p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {format(new Date(comment.createdAt), "MMM d, h:mm a")}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-border/60 bg-background px-5 py-4">
              {isAuthenticated ? (
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Write a quick reply..."
                    className="h-11 flex-1 rounded-full border border-border/60 bg-muted/30 px-4 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddComment();
                    }}
                    disabled={isLoading}
                  />
                  <Button className="rounded-full px-5" onClick={handleAddComment} disabled={isLoading}>
                    Post
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sign in to join the conversation.
                </p>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </motion.div>
  );
}

export default memo(EventCard);
