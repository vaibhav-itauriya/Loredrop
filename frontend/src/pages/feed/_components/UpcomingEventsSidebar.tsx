import { Card } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { format } from "date-fns";
import { Calendar, MapPin } from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel";

type EventWithOrg = Doc<"events"> & {
  organization: Doc<"organizations"> | null;
};

type UpcomingEventsSidebarProps = {
  events: EventWithOrg[];
};

export default function UpcomingEventsSidebar({ events }: UpcomingEventsSidebarProps) {
  if (events.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3
        className="text-sm font-semibold text-muted-foreground uppercase tracking-wider"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Upcoming Events
      </h3>
      <div className="space-y-3">
        {events.map((event) => (
          <Card
            key={event._id}
            className="p-4 hover:shadow-md hover:border-primary/20 transition-all cursor-pointer"
          >
            <div className="flex gap-3">
              {/* Date Column */}
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
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

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm line-clamp-1 mb-1">
                  {event.title}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>{format(new Date(event.dateTime), "h:mm a")}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{event.venue}</span>
                </div>
              </div>
            </div>

            {/* Organization Badge */}
            {event.organization && (
              <Badge variant="secondary" className="mt-3 text-xs">
                {event.organization.name}
              </Badge>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
