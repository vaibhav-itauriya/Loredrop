import { useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";
import { groupOrganizations } from "@/lib/org-hierarchy.ts";
import { Check, Compass, Flame, Layers3, Plus, Sparkles, Users2 } from "lucide-react";

type Organization = any;

function OrgLogo({ org }: { org: Organization }) {
  const [failed, setFailed] = useState(false);
  const showImage = !!org.logo && !failed;
  if (showImage) {
    return (
      <img
        src={org.logo}
        alt={org.name}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-6 w-6 rounded-lg object-cover"
      />
    );
  }
  return (
    <span className="text-xs font-bold text-primary">
      {(org.name || "?").charAt(0).toUpperCase()}
    </span>
  );
}

type OrganizationFilterProps = {
  organizations: Organization[];
  selectedId: string | null;
  isAuthenticated: boolean;
  subscribedOrganizations: Organization[];
  onSelect: (id: string) => void;
};

export default function OrganizationFilter({
  organizations,
  selectedId,
  isAuthenticated,
  subscribedOrganizations,
  onSelect,
}: OrganizationFilterProps) {
  const { councils, festivals, others } = groupOrganizations(organizations);
  const allClubs = organizations
    .filter((org) => org.type === "club")
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="max-h-[75vh] overflow-y-auto rounded-[1.75rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(248,250,252,0.9))] p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl no-scrollbar dark:border-slate-700/70 dark:bg-[linear-gradient(145deg,rgba(15,23,42,0.96),rgba(30,41,59,0.92))] dark:shadow-[0_18px_50px_rgba(2,6,23,0.3)]">
      <div className="mb-5 rounded-[1.45rem] border border-white/70 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(96,165,250,0.14),transparent_40%),linear-gradient(145deg,#fff8ef_0%,#ffffff_55%,#f3f8ff_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:border-slate-700 dark:bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(96,165,250,0.12),transparent_40%),linear-gradient(145deg,rgba(30,41,59,0.95),rgba(15,23,42,0.92),rgba(17,24,39,0.95))] dark:shadow-none">
        <div className="flex items-center gap-2 text-primary">
          <Compass className="h-4 w-4" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em]">Explore</p>
        </div>
        <h3 className="mt-2 text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          Follow campus energy
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
         
        </p>
        <Badge variant="secondary" className="mt-3 rounded-full bg-white px-3 py-1 text-xs text-slate-700 dark:bg-slate-900/80 dark:text-slate-200">
          {organizations.length} organizations
        </Badge>
      </div>

      <div className="space-y-6 pr-1">
      <div>
        <h3 className="mb-3 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          Subscribed Orgs
        </h3>

        {!isAuthenticated && (
          <div className="rounded-[1.25rem] border border-dashed border-slate-300/80 bg-white/65 p-4 text-sm text-muted-foreground dark:border-slate-700 dark:bg-slate-900/50">
            Sign in to see subscribed organizations here.
          </div>
        )}

        {isAuthenticated && subscribedOrganizations.length === 0 && (
          <div className="rounded-[1.25rem] border border-dashed border-slate-300/80 bg-white/65 p-4 text-sm text-muted-foreground dark:border-slate-700 dark:bg-slate-900/50">
            Subscribe from any event card and your organizations will appear here.
          </div>
        )}

        {isAuthenticated && subscribedOrganizations.length > 0 && (
          <div className="space-y-1">
            {subscribedOrganizations.slice(0, 8).map((org) => (
              <Button
                key={org._id}
                variant={selectedId === org._id ? "secondary" : "ghost"}
                className={cn(
                  "h-auto w-full justify-start gap-3 rounded-[1.15rem] border border-transparent px-3 py-3 transition-colors",
                  selectedId === org._id ? "border-primary/20 bg-primary/10 text-foreground shadow-[0_10px_20px_rgba(99,102,241,0.08)]" : "hover:bg-white/75 dark:hover:bg-slate-900/65"
                )}
                onClick={() => onSelect(org._id)}
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
                  <OrgLogo org={org} />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium">{org.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedId === org._id ? "Currently viewing" : "Open organization page"}
                  </p>
                </div>
                {selectedId === org._id ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            ))}
          </div>
        )}
      </div>

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
                  "h-auto w-full justify-start gap-3 rounded-[1.15rem] border border-transparent px-3 py-3 transition-colors",
                  selectedId === org._id ? "border-primary/20 bg-primary/10 text-foreground shadow-[0_10px_20px_rgba(99,102,241,0.08)]" : "hover:bg-white/75 dark:hover:bg-slate-900/65"
                )}
                onClick={() => onSelect(org._id)}
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
                  <OrgLogo org={org} />
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
                  "h-auto w-full justify-start gap-3 rounded-[1.15rem] border border-transparent px-3 py-3 transition-colors",
                  selectedId === org._id ? "border-accent/20 bg-accent/10 text-foreground shadow-[0_10px_20px_rgba(249,115,22,0.08)]" : "hover:bg-white/75 dark:hover:bg-slate-900/65"
                )}
                onClick={() => onSelect(org._id)}
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-primary/20">
                  <OrgLogo org={org} />
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
                  "h-auto w-full justify-start gap-3 rounded-[1.15rem] border border-transparent px-3 py-3 transition-colors",
                  selectedId === org._id ? "border-border bg-muted/80 text-foreground shadow-[0_10px_20px_rgba(15,23,42,0.06)]" : "hover:bg-white/75 dark:hover:bg-slate-900/65"
                )}
                onClick={() => onSelect(org._id)}
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-muted to-muted/50">
                  <OrgLogo org={org} />
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
                  "h-auto w-full justify-start gap-3 rounded-[1.15rem] border border-transparent px-3 py-3 transition-colors",
                  selectedId === org._id ? "border-border bg-muted/80 text-foreground shadow-[0_10px_20px_rgba(15,23,42,0.06)]" : "hover:bg-white/75 dark:hover:bg-slate-900/65"
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
