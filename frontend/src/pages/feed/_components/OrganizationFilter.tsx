import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";
import { groupOrganizations } from "@/lib/org-hierarchy.ts";
import { Compass, Flame, Layers3, Sparkles, Users2 } from "lucide-react";

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
  const { councils, festivals, others } = groupOrganizations(organizations);
  const allClubs = organizations
    .filter((org) => org.type === "club")
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="max-h-[75vh] overflow-y-auto rounded-[1.75rem] border border-border/60 bg-card/70 p-4 shadow-[0_18px_60px_rgba(16,24,40,0.05)] backdrop-blur-xl no-scrollbar">
      <div className="mb-5 rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
        <div className="flex items-center gap-2 text-primary">
          <Compass className="h-4 w-4" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em]">Explore</p>
        </div>
        <h3 className="mt-2 text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          Follow campus energy
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
         
        </p>
        <Badge variant="secondary" className="mt-3 rounded-full px-3 py-1 text-xs">
          {organizations.length} organizations
        </Badge>
      </div>

      <div className="space-y-6 pr-1">
        <Button
          variant={selectedId === null ? "default" : "ghost"}
          className={cn(
            "h-11 w-full justify-start rounded-2xl px-4",
            selectedId === null && "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
          )}
          onClick={() => onSelect(null)}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          For You
        </Button>

      {councils.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <Layers3 className="h-3.5 w-3.5" />
            Councils
          </h3>
          <div className="space-y-1">
            {councils.map((org) => (
              <Button
                key={org._id}
                variant={selectedId === org._id ? "secondary" : "ghost"}
                className={cn(
                  "h-auto w-full justify-start gap-3 rounded-2xl border border-transparent px-3 py-3 transition-all",
                  selectedId === org._id && "border-primary/20 bg-primary/10 text-foreground"
                )}
                onClick={() => onSelect(org._id)}
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
                  {org.logo ? (
                    <img
                      src={org.logo}
                      alt={org.name}
                      className="h-6 w-6 rounded-lg object-cover"
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

      {festivals.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <Flame className="h-3.5 w-3.5" />
            Festivals
          </h3>
          <div className="space-y-1">
            {festivals.map((org) => (
              <Button
                key={org._id}
                variant={selectedId === org._id ? "secondary" : "ghost"}
                className={cn(
                  "h-auto w-full justify-start gap-3 rounded-2xl border border-transparent px-3 py-3 transition-all",
                  selectedId === org._id && "border-accent/20 bg-accent/10 text-foreground"
                )}
                onClick={() => onSelect(org._id)}
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-primary/20">
                  {org.logo ? (
                    <img
                      src={org.logo}
                      alt={org.name}
                      className="h-6 w-6 rounded-lg object-cover"
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

      {allClubs.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <Users2 className="h-3.5 w-3.5" />
            Clubs
          </h3>
          <div className="space-y-1">
            {allClubs.map((org) => (
              <Button
                key={org._id}
                variant={selectedId === org._id ? "secondary" : "ghost"}
                className={cn(
                  "h-auto w-full justify-start gap-3 rounded-2xl border border-transparent px-3 py-3 transition-all",
                  selectedId === org._id && "border-border bg-muted/80 text-foreground"
                )}
                onClick={() => onSelect(org._id)}
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-muted to-muted/50">
                  {org.logo ? (
                    <img
                      src={org.logo}
                      alt={org.name}
                      className="h-6 w-6 rounded-lg object-cover"
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

      {others.length > 0 && (
        <div>
          <h3 className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Others
          </h3>
          <div className="space-y-1">
            {others.map((org) => (
              <Button
                key={org._id}
                variant={selectedId === org._id ? "secondary" : "ghost"}
                className={cn(
                  "h-auto w-full justify-start gap-3 rounded-2xl border border-transparent px-3 py-3 transition-all",
                  selectedId === org._id && "border-border bg-muted/80 text-foreground"
                )}
                onClick={() => onSelect(org._id)}
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-muted">
                  <span className="text-xs font-bold">{org.name.charAt(0)}</span>
                </div>
                <span className="truncate text-sm">{org.name}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
