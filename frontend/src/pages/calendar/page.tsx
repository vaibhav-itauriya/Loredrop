import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import FeedHeader from "../feed/_components/FeedHeader.tsx";
import EventCard from "../feed/_components/EventCard.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Calendar, ArrowLeft } from "lucide-react";
import { interactionsAPI } from "@/lib/api";
import { toast } from "sonner";

export default function CalendarPage() {
  const [savedEvents, setSavedEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch saved events
  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      try {
        const data = await interactionsAPI.getCalendarSaves();
        setSavedEvents(data);
      } catch (error) {
        console.error("Failed to fetch calendar saves:", error);
        toast.error("Failed to load saved events");
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, []);

  // Sort by event date
  const sortedEvents = [...savedEvents].sort(
    (a, b) => new Date(a.eventId?.dateTime || 0).getTime() - new Date(b.eventId?.dateTime || 0).getTime()
  );

  return (
    <div className="min-h-screen bg-background">
      <FeedHeader />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/feed">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1
              className="text-3xl font-bold flex items-center gap-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <Calendar className="w-8 h-8" />
              My Calendar
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Events you've saved for later
            </p>
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
        {!isLoading && sortedEvents.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Calendar />
              </EmptyMedia>
              <EmptyTitle>No saved events</EmptyTitle>
              <EmptyDescription>
                Start saving events by clicking the calendar icon on any event card!
              </EmptyDescription>
            </EmptyHeader>
            <Link to="/feed">
              <Button className="mt-4">Explore Events</Button>
            </Link>
          </Empty>
        )}

        {/* Saved Events */}
        {!isLoading && sortedEvents.length > 0 && (
          <div className="space-y-6">
            {sortedEvents.map(({ eventId, _id }) => (
              <EventCard key={_id} event={eventId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
