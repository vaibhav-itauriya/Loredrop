import { Button } from "@/components/ui/button.tsx";
import { Check, Plus, Sparkles } from "lucide-react";

type MyFeedSidebarProps = {
  isAuthenticated: boolean;
  subscribedOrganizations: any[];
  selectedOrgId: string | null;
  onSelectOrganization: (id: string) => void;
};

export default function MyFeedSidebar({
  isAuthenticated,
  subscribedOrganizations,
  selectedOrgId,
  onSelectOrganization,
}: MyFeedSidebarProps) {
  return (
    <div className="rounded-[1.75rem] border border-border/60 bg-card/75 p-4 shadow-[0_18px_60px_rgba(16,24,40,0.05)] backdrop-blur-xl">
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1 text-primary">
          <Sparkles className="h-4 w-4" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em]">My Feed</p>
        </div>

        {!isAuthenticated && (
          <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
            Sign in to subscribe to organizations and personalize this feed.
          </div>
        )}

        {isAuthenticated && subscribedOrganizations.length === 0 && (
          <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
            Subscribe to an organization from any post to pin it into your feed.
          </div>
        )}

        {isAuthenticated && subscribedOrganizations.length > 0 && (
          <div className="space-y-2">
            {subscribedOrganizations.slice(0, 8).map((org) => {
              const active = selectedOrgId === org._id;
              return (
                <Button
                  key={org._id}
                  variant={active ? "secondary" : "ghost"}
                  className="h-auto w-full justify-start gap-3 rounded-2xl border border-transparent px-3 py-3"
                  onClick={() => onSelectOrganization(org._id)}
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
                    {org.logo ? (
                      <img src={org.logo} alt={org.name} className="h-6 w-6 rounded-lg object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-primary">
                        {org.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-medium">{org.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {active ? "Currently viewing" : "Tap to filter feed"}
                    </p>
                  </div>
                  {active ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4 text-muted-foreground" />}
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
