import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";

type Organization = any;

type OrganizationFilterProps = {
  organizations: Organization[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

export default function OrganizationFilter({
  organizations,
  selectedId,
  onSelect,
}: OrganizationFilterProps) {
  // Group organizations by type
  const councils = organizations.filter((org) => org.type === "council");
  const clubs = organizations.filter((org) => org.type === "club");
  const festivals = organizations.filter((org) => org.type === "festival");
  const others = organizations.filter(
    (org) => !["council", "club", "festival"].includes(org.type)
  );

  return (
    <div className="space-y-6">
      {/* For You / All */}
      <div>
        <Button
          variant={selectedId === null ? "default" : "ghost"}
          className={cn(
            "w-full justify-start",
            selectedId === null && "bg-primary text-primary-foreground"
          )}
          onClick={() => onSelect(null)}
        >
          For You
        </Button>
      </div>

      {/* Councils */}
      {councils.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
            Councils
          </h3>
          <div className="space-y-1">
            {councils.map((org) => (
              <Button
                key={org._id}
                variant={selectedId === org._id ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-auto py-2",
                  selectedId === org._id && "bg-secondary"
                )}
                onClick={() => onSelect(org._id)}
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                  {org.logo ? (
                    <img
                      src={org.logo}
                      alt={org.name}
                      className="w-6 h-6 rounded"
                    />
                  ) : (
                    <span className="text-xs font-bold text-primary">
                      {org.name.charAt(0)}
                    </span>
                  )}
                </div>
                <span className="truncate text-sm">{org.name}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Festivals */}
      {festivals.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
            Festivals
          </h3>
          <div className="space-y-1">
            {festivals.map((org) => (
              <Button
                key={org._id}
                variant={selectedId === org._id ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-auto py-2",
                  selectedId === org._id && "bg-secondary"
                )}
                onClick={() => onSelect(org._id)}
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center flex-shrink-0">
                  {org.logo ? (
                    <img
                      src={org.logo}
                      alt={org.name}
                      className="w-6 h-6 rounded"
                    />
                  ) : (
                    <span className="text-xs font-bold text-accent">
                      {org.name.charAt(0)}
                    </span>
                  )}
                </div>
                <span className="truncate text-sm">{org.name}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Clubs */}
      {clubs.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
            Clubs
          </h3>
          <div className="space-y-1">
            {clubs.map((org) => (
              <Button
                key={org._id}
                variant={selectedId === org._id ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-auto py-2",
                  selectedId === org._id && "bg-secondary"
                )}
                onClick={() => onSelect(org._id)}
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center flex-shrink-0">
                  {org.logo ? (
                    <img
                      src={org.logo}
                      alt={org.name}
                      className="w-6 h-6 rounded"
                    />
                  ) : (
                    <span className="text-xs font-bold text-foreground">
                      {org.name.charAt(0)}
                    </span>
                  )}
                </div>
                <span className="truncate text-sm">{org.name}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Others */}
      {others.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
            Others
          </h3>
          <div className="space-y-1">
            {others.map((org) => (
              <Button
                key={org._id}
                variant={selectedId === org._id ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-auto py-2",
                  selectedId === org._id && "bg-secondary"
                )}
                onClick={() => onSelect(org._id)}
              >
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold">{org.name.charAt(0)}</span>
                </div>
                <span className="truncate text-sm">{org.name}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
