import { Card } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { format } from "date-fns";
import { Calendar, ChevronRight, MapPin, Sparkles } from "lucide-react";

type EventWithOrg = {
  _id: string;
  title: string;
  dateTime: string;
  venue?: string;
  organization?: {
    _id?: string;
    name?: string;
  } | null;
};

type UpcomingEventsSidebarProps = {
  events: EventWithOrg[];
};

export default function UpcomingEventsSidebar({ events }: UpcomingEventsSidebarProps) {
  if (events.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p
            className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Upcoming
          </p>
          <h3 className="mt-1 text-lg font-semibold">What is next on campus</h3>
        </div>
        <Badge variant="secondary" className="gap-1.5 rounded-full px-3 py-1 text-xs">
          <Sparkles className="h-3 w-3" />
          {events.length} lined up
        </Badge>
      </div>
      <div className="space-y-3">
        {events.map((event) => (
          <Card
            key={event._id}
            className="group overflow-hidden border-border/60 bg-card/70 p-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_20px_50px_rgba(88,74,217,0.12)]"
          >
            <div className="flex gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/15 to-accent/15">
                <span className="text-xs font-medium text-primary">
                  {format(new Date(event.dateTime), "MMM")}
                </span>
                <span
                  className="text-lg font-bold text-primary"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {format(new Date(event.dateTime), "d")}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="mb-1 line-clamp-1 text-sm font-semibold transition-colors group-hover:text-primary">
                  {event.title}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>{format(new Date(event.dateTime), "h:mm a")}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{event.venue || "Venue TBA"}</span>
                </div>
              </div>
              <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </div>

            {event.organization && (
              <Badge variant="secondary" className="mt-3 rounded-full bg-primary/8 text-xs text-primary">
                {event.organization.name}
              </Badge>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
