import { format, isPast, isToday, isTomorrow } from "date-fns";
import { useState, useEffect, useMemo, memo } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import {
  ArrowUp,
  Bookmark,
  MessageCircle,
  Calendar,
  MapPin,
  ExternalLink,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { interactionsAPI } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth.ts";
import { createFallbackImageDataUrl } from "@/lib/placeholders.ts";

type EventCardProps = {
  event: any;
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

const audienceLabels: Record<string, string> = {
  ug: "UG",
  pg: "PG",
  phd: "PhD",
  faculty: "Faculty",
  staff: "Staff",
  all: "Everyone",
};

function EventCard({ event }: EventCardProps) {
  const { isAuthenticated } = useAuth();
  const [hasUpvoted, setHasUpvoted] = useState(event.hasUpvoted || false);
  const [upvoteCount, setUpvoteCount] = useState(event.upvoteCount || 0);
  const [hasCalendarSave, setHasCalendarSave] = useState(event.hasCalendarSave || false);
  const [comments, setComments] = useState<any[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch comments only when user opens comments section
  useEffect(() => {
    if (!showComments) return;
    
    let cancelled = false;
    const fetch = async () => {
      try {
        const data = await interactionsAPI.getComments(event._id);
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
  }, [event._id, showComments]);

  const handleUpvote = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to upvote");
      return;
    }

    try {
      setIsLoading(true);
      await interactionsAPI.toggleUpvote(event._id);
      
      // Update like count with +1 or -1
      if (!hasUpvoted) {
        setUpvoteCount(upvoteCount + 1);
        toast.success("Liked! ❤️");
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
      await interactionsAPI.toggleCalendarSave(event._id);
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

    const startTime = new Date(event.dateTime).toISOString().replace(/[-:]/g, '').split('.')[0];
    const endTime = event.endDateTime
      ? new Date(event.endDateTime).toISOString().replace(/[-:]/g, '').split('.')[0]
      : new Date(new Date(event.dateTime).getTime() + 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0];

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      event.title
    )}&dates=${startTime}/${endTime}&details=${encodeURIComponent(
      event.description
    )}&location=${encodeURIComponent(event.venue)}&sf=true`;

    window.open(googleCalendarUrl, '_blank');
    toast.success('Opening Google Calendar...');
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
      await interactionsAPI.addComment(event._id, commentText);
      setCommentText("");
      const data = await interactionsAPI.getComments(event._id);
      setComments(data);
      toast.success("Comment added!");
    } catch (error) {
      console.error("Failed to add comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setIsLoading(false);
    }
  };

  // Memoize computed values to prevent recalculation on every render
  const org = useMemo(() => event.organizationId, [event.organizationId]);
  const author = useMemo(() => event.authorId, [event.authorId]);
  const firstImageUrl = useMemo(
    () =>
      event.media?.[0]?.url ||
      createFallbackImageDataUrl(
        `${event._id || event.title}-${org?.name || "event"}`,
        event.title || org?.name,
      ),
    [event._id, event.media, event.title, org?.name],
  );
  
  // Memoize date calculations
  const eventDateLabel = useMemo(() => getEventDateLabel(event.dateTime), [event.dateTime]);
  const eventTimeDisplay = useMemo(() => getEventTimeDisplay(event.dateTime), [event.dateTime]);
  // Memoize audience labels
  const audienceDisplay = useMemo(() => {
    return event.audience?.map((a: string) => audienceLabels[a]).join(", ") || "Everyone";
  }, [event.audience]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
    <Card
      data-event-id={event._id}
      className="group overflow-hidden rounded-[1.75rem] border-border/60 bg-card/80 shadow-[0_18px_60px_rgba(16,24,40,0.06)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_24px_80px_rgba(88,74,217,0.14)]"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        <img
          src={firstImageUrl}
          alt={event.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <Badge className="rounded-full bg-background/90 px-3 text-foreground backdrop-blur-sm">
            {eventDateLabel}
          </Badge>
          <Badge variant="secondary" className="rounded-full bg-primary/85 px-3 text-primary-foreground">
            {event.mode}
          </Badge>
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/75">Next up</p>
            <p className="mt-1 text-lg font-semibold text-white">{eventTimeDisplay}</p>
          </div>
          <div className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white backdrop-blur-sm">
            {format(new Date(event.dateTime), "MMM d, yyyy")}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {org?.slug ? (
                <Link to={`/organizations/${org.slug}`} className="flex items-center gap-3 min-w-0 group">
                  <Avatar className="w-10 h-10 rounded-lg flex-shrink-0">
                    <AvatarImage src={author?.avatar || org?.logo} alt={author?.displayName || org?.name} />
                    <AvatarFallback className="rounded-lg">
                      {(author?.displayName || author?.name || org?.name || "L").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-muted-foreground truncate group-hover:text-foreground transition-colors">
                      {org?.name || "Unknown Organization"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {author?.name || author?.displayName || "Unknown Author"}
                    </p>
                  </div>
                </Link>
              ) : (
                <>
                  <Avatar className="w-10 h-10 rounded-lg flex-shrink-0">
                    <AvatarImage src={author?.avatar || org?.logo} alt={author?.displayName || org?.name} />
                    <AvatarFallback className="rounded-lg">
                      {(author?.displayName || author?.name || org?.name || "L").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-muted-foreground truncate">
                      {org?.name || "Unknown Organization"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {author?.name || author?.displayName || "Unknown Author"}
                    </p>
                  </div>
                </>
              )}
            </div>
          <div className="hidden sm:flex flex-col items-end text-right">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Audience</span>
            <span className="mt-1 text-sm font-medium">{audienceDisplay}</span>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg sm:text-xl font-semibold leading-tight" style={{ fontFamily: "var(--font-display)" }}>{event.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-3 leading-6">
            {event.description}
          </p>
        </div>

        <div className="grid gap-3 rounded-2xl border border-border/60 bg-muted/35 p-4 sm:grid-cols-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              {format(new Date(event.dateTime), "MMM d, yyyy")} at{" "}
              {eventTimeDisplay}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{event.venue}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-2 sm:hidden">
            <span>For: {audienceDisplay}</span>
          </div>
        </div>

        {event.tags && event.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {event.tags.slice(0, 3).map((tag: string) => (
              <Badge key={tag} variant="outline" className="rounded-full border-primary/15 bg-primary/5 px-3 text-xs text-primary">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/50">
          <div className="flex items-center gap-1 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              className={`gap-1.5 rounded-full ${hasUpvoted ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-primary"}`}
              onClick={handleUpvote}
              disabled={isLoading}
            >
              <ArrowUp className="w-4 h-4" />
              <span>{upvoteCount}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 rounded-full text-muted-foreground hover:text-primary"
              onClick={() => setShowComments(!showComments)}
            >
              <MessageCircle className="w-4 h-4" />
              <span>{event.commentCount}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-full text-muted-foreground hover:text-primary ${
                hasCalendarSave ? "text-accent" : ""
              }`}
              onClick={handleCalendarSave}
              disabled={isLoading}
              title="Add to calendar"
            >
              <Bookmark className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 rounded-full text-muted-foreground hover:text-primary"
              onClick={handleAddToGoogleCalendar}
              disabled={!isAuthenticated}
              title="Add to Google Calendar"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>

          {event.registrationLink && (
            <Button size="sm" className="gap-1.5 rounded-full px-4 shadow-lg shadow-primary/20" asChild>
              <a href={event.registrationLink} target="_blank" rel="noopener noreferrer">
                Register
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </Button>
          )}
        </div>

        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="pt-4 border-t border-border/50 space-y-3"
          >
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  No comments yet
                </p>
              ) : (
                comments.map((comment: any) => (
                  <div key={comment._id} className="text-sm p-2 bg-muted/50 rounded">
                    <p className="font-medium text-xs">{comment.userId?.name || comment.userId?.displayName}</p>
                    <p className="text-muted-foreground">{comment.text}</p>
                    <p className="text-xs text-muted-foreground/75 mt-1">
                      {format(new Date(comment.createdAt), "MMM d, h:mm a")}
                    </p>
                  </div>
                ))
              )}
            </div>

            {isAuthenticated && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  className="flex-1 text-sm px-3 py-2 rounded-xl bg-muted border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleAddComment();
                  }}
                  disabled={isLoading}
                />
                <Button size="sm" onClick={handleAddComment} disabled={isLoading}>
                  Post
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </Card>
    </motion.div>
  );
}

// Memoize EventCard to prevent unnecessary re-renders
export default memo(EventCard);
