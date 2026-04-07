import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { X, Filter, Calendar, Monitor, Users, Search } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet.tsx";
import { cn } from "@/lib/utils.ts";
import { groupOrganizations, type OrganizationLike } from "@/lib/org-hierarchy.ts";

export interface FilterOptions {
  dateRange?: "today" | "tomorrow" | "week" | "month" | "all";
  eventMode?: ("online" | "offline" | "hybrid")[];
  audience?: ("ug" | "pg" | "phd" | "faculty" | "staff")[];
  organizations?: string[];
}

interface EventFiltersProps {
  onFilterChange: (filters: FilterOptions) => void;
  currentFilters?: FilterOptions;
  organizations?: { _id: string; name: string }[];
  variant?: "inline" | "sheet";
}

const DATE_OPTIONS = [
  { value: "today", label: "Today", icon: Calendar },
  { value: "tomorrow", label: "Tomorrow", icon: Calendar },
  { value: "week", label: "This Week", icon: Calendar },
  { value: "month", label: "This Month", icon: Calendar },
  { value: "all", label: "Any Time", icon: Calendar },
] as const;

const MODE_OPTIONS = [
  { value: "online", label: "Online" },
  { value: "offline", label: "Offline" },
  { value: "hybrid", label: "Hybrid" },
] as const;

const AUDIENCE_OPTIONS = [
  { value: "ug", label: "UG" },
  { value: "pg", label: "PG" },
  { value: "phd", label: "PhD" },
  { value: "faculty", label: "Faculty" },
  { value: "staff", label: "Staff" },
] as const;

function getActiveFilterCount(filters: FilterOptions) {
  return [
    filters.dateRange && filters.dateRange !== "all" ? 1 : 0,
    filters.eventMode?.length ?? 0,
    filters.audience?.length ?? 0,
    filters.organizations?.length ?? 0,
  ].reduce((a, b) => a + b, 0);
}

function areFiltersEqual(a: FilterOptions, b: FilterOptions) {
  return JSON.stringify(a ?? {}) === JSON.stringify(b ?? {});
}

export function EventFilters({
  onFilterChange,
  currentFilters = {},
  organizations = [],
  variant = "inline",
}: EventFiltersProps) {
  const [filters, setFilters] = useState<FilterOptions>(currentFilters);
  const [draftFilters, setDraftFilters] = useState<FilterOptions>(currentFilters);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [organizationQuery, setOrganizationQuery] = useState("");

  useEffect(() => {
    setFilters(currentFilters);
    if (!sheetOpen) {
      setDraftFilters(currentFilters);
    }
  }, [currentFilters, sheetOpen]);

  const updateAppliedFilters = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleDateChange = (range: string) => {
    const newValue = range === "all" || filters.dateRange === range ? undefined : (range as FilterOptions["dateRange"]);
    const newFilters = { ...filters, dateRange: newValue };
    updateAppliedFilters(newFilters);
  };

  const handleModeToggle = (mode: "online" | "offline" | "hybrid") => {
    const modes = filters.eventMode || [];
    const newModes = modes.includes(mode)
      ? modes.filter((m) => m !== mode)
      : [...modes, mode];
    const newFilters = {
      ...filters,
      eventMode: newModes.length > 0 ? newModes : undefined,
    };
    updateAppliedFilters(newFilters);
  };

  const handleAudienceToggle = (
    aud: "ug" | "pg" | "phd" | "faculty" | "staff"
  ) => {
    const audience = filters.audience || [];
    const newAudience = audience.includes(aud)
      ? audience.filter((a) => a !== aud)
      : [...audience, aud];
    const newFilters = {
      ...filters,
      audience: newAudience.length > 0 ? newAudience : undefined,
    };
    updateAppliedFilters(newFilters);
  };

  const handleDraftDateChange = (range: string) => {
    setDraftFilters((prev) => {
      const newValue =
        range === "all" || prev.dateRange === range
          ? undefined
          : (range as FilterOptions["dateRange"]);
      return { ...prev, dateRange: newValue };
    });
  };

  const handleDraftModeToggle = (mode: "online" | "offline" | "hybrid") => {
    setDraftFilters((prev) => {
      const modes = prev.eventMode || [];
      const newModes = modes.includes(mode)
        ? modes.filter((m) => m !== mode)
        : [...modes, mode];
      return {
        ...prev,
        eventMode: newModes.length > 0 ? newModes : undefined,
      };
    });
  };

  const handleDraftAudienceToggle = (
    aud: "ug" | "pg" | "phd" | "faculty" | "staff"
  ) => {
    setDraftFilters((prev) => {
      const audience = prev.audience || [];
      const newAudience = audience.includes(aud)
        ? audience.filter((a) => a !== aud)
        : [...audience, aud];
      return {
        ...prev,
        audience: newAudience.length > 0 ? newAudience : undefined,
      };
    });
  };

  const handleDraftOrgToggle = (orgId: string) => {
    setDraftFilters((prev) => {
      const orgs = prev.organizations || [];
      const newOrgs = orgs.includes(orgId)
        ? orgs.filter((o) => o !== orgId)
        : [...orgs, orgId];
      return {
        ...prev,
        organizations: newOrgs.length > 0 ? newOrgs : undefined,
      };
    });
  };

  const handleApplyDraftFilters = () => {
    updateAppliedFilters(draftFilters);
    setSheetOpen(false);
  };

  const handleCancelDraftFilters = () => {
    setDraftFilters(filters);
    setOrganizationQuery("");
    setSheetOpen(false);
  };

  const handleClearDraft = () => {
    const emptyFilters: FilterOptions = {};
    setDraftFilters(emptyFilters);
    setOrganizationQuery("");
  };

  const handleClearApplied = () => {
    const emptyFilters: FilterOptions = {};
    updateAppliedFilters(emptyFilters);
    setDraftFilters(emptyFilters);
    setOrganizationQuery("");
    setSheetOpen(false);
  };

  const handleSheetOpenChange = (open: boolean) => {
    if (open) {
      setDraftFilters(filters);
      setOrganizationQuery("");
    }
    setSheetOpen(open);
  };

  const hasActiveFilters = getActiveFilterCount(filters) > 0;
  const activeFilterCount = getActiveFilterCount(filters);
  const draftFilterCount = getActiveFilterCount(draftFilters);
  const hasDraftChanges = !areFiltersEqual(filters, draftFilters);

  const organizationNameById = useMemo(
    () => new Map(organizations.map((org) => [org._id, org.name])),
    [organizations]
  );

  const activeFilterSummary = useMemo(() => {
    const labels: string[] = [];
    const dateLabel = DATE_OPTIONS.find((opt) => opt.value === filters.dateRange)?.label;
    if (dateLabel && filters.dateRange !== "all") labels.push(dateLabel);

    (filters.eventMode || []).forEach((mode) => {
      const match = MODE_OPTIONS.find((opt) => opt.value === mode);
      if (match) labels.push(match.label);
    });

    (filters.audience || []).forEach((aud) => {
      const match = AUDIENCE_OPTIONS.find((opt) => opt.value === aud);
      if (match) labels.push(match.label);
    });

    (filters.organizations || []).forEach((orgId) => {
      labels.push(organizationNameById.get(orgId) || "Organization");
    });

    if (labels.length === 0) return "All events";
    if (labels.length <= 2) return labels.join(", ");
    return `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`;
  }, [filters, organizationNameById]);

  const FilterChip = ({
    active,
    onClick,
    children,
    className,
  }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
        "border hover:border-primary/50",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-muted/50 border-transparent hover:bg-muted",
        className
      )}
    >
      {children}
    </button>
  );

  const renderFilterSheet = (trigger: React.ReactNode) => (
    <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="left" className="w-full gap-0 overflow-y-auto p-0 sm:w-[430px]">
        <SheetHeader className="sticky top-0 z-10 border-b border-border/60 bg-background/95 px-4 py-4 backdrop-blur-sm">
          <div className="pr-8">
            <SheetTitle className="text-lg">More Filters</SheetTitle>
            <SheetDescription className="mt-1 text-xs">
              {draftFilterCount > 0
                ? `${draftFilterCount} selected in this view`
                : "Select filters to narrow down events"}
            </SheetDescription>
          </div>
        </SheetHeader>
        <FilterFormContent
          filters={draftFilters}
          organizations={organizations}
          organizationQuery={organizationQuery}
          onOrganizationQueryChange={setOrganizationQuery}
          onDateChange={handleDraftDateChange}
          onModeToggle={handleDraftModeToggle}
          onAudienceToggle={handleDraftAudienceToggle}
          onOrgToggle={handleDraftOrgToggle}
        />
        <SheetFooter className="sticky bottom-0 mt-0 gap-3 border-t border-border/60 bg-background/95 px-4 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={handleCancelDraftFilters}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={handleClearDraft}
              disabled={draftFilterCount === 0}
            >
              Clear
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={handleApplyDraftFilters}
              disabled={!hasDraftChanges}
            >
              Apply{draftFilterCount > 0 ? ` (${draftFilterCount})` : ""}
            </Button>
          </div>
          {hasActiveFilters && (
            <Button
              size="sm"
              variant="ghost"
              className="w-full justify-center text-muted-foreground hover:text-foreground"
              onClick={handleClearApplied}
            >
              <X className="mr-1 h-4 w-4" />
              Clear applied filters
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );

  if (variant === "sheet") {
    return renderFilterSheet(
      <Button variant="outline" size="sm" className="relative">
        <Filter className="w-4 h-4 mr-2" />
        Filters
        {activeFilterCount > 0 && (
          <Badge
            variant="secondary"
            className="ml-1.5 h-5 min-w-5 px-1.5 rounded-full text-xs"
          >
            {activeFilterCount}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Date Range - Quick chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground mr-1 hidden sm:inline">
          When:
        </span>
        {DATE_OPTIONS.slice(0, 4).map(({ value, label }) => (
          <FilterChip
            key={value}
            active={filters.dateRange === value}
            onClick={() => handleDateChange(filters.dateRange === value ? "all" : value)}
          >
            {label}
          </FilterChip>
        ))}
      </div>

      {/* Event Mode - Quick chips */}
      <div className="flex flex-wrap items-center gap-2 border-l border-border pl-2 ml-1">
        <span className="text-xs font-medium text-muted-foreground mr-1 hidden sm:inline">
          Mode:
        </span>
        {MODE_OPTIONS.map(({ value, label }) => (
          <FilterChip
            key={value}
            active={filters.eventMode?.includes(value) ?? false}
            onClick={() => handleModeToggle(value)}
          >
            {label}
          </FilterChip>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {renderFilterSheet(
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "relative h-8",
              hasActiveFilters && "border-primary/50 bg-primary/5"
            )}
          >
            <Filter className="w-4 h-4 mr-1.5" />
            More Filters
            {activeFilterCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-1.5 h-4 min-w-4 px-1 rounded-full text-[10px] bg-primary/20 text-primary"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        )}
        <p className="hidden text-xs text-muted-foreground md:block">
          {activeFilterSummary}
        </p>
      </div>
    </div>
  );
}

function FilterFormContent({
  filters,
  organizations,
  organizationQuery,
  onOrganizationQueryChange,
  onDateChange,
  onModeToggle,
  onAudienceToggle,
  onOrgToggle,
}: {
  filters: FilterOptions;
  organizations: { _id: string; name: string }[];
  organizationQuery: string;
  onOrganizationQueryChange: (value: string) => void;
  onDateChange: (range: string) => void;
  onModeToggle: (mode: "online" | "offline" | "hybrid") => void;
  onAudienceToggle: (aud: "ug" | "pg" | "phd" | "faculty" | "staff") => void;
  onOrgToggle: (orgId: string) => void;
}) {
  const normalizedOrgQuery = organizationQuery.trim().toLowerCase();
  const visibleOrganizations = useMemo(() => {
    if (!normalizedOrgQuery) return organizations;
    return organizations.filter((org) =>
      org.name.toLowerCase().includes(normalizedOrgQuery)
    );
  }, [normalizedOrgQuery, organizations]);

  const grouped = useMemo(
    () => groupOrganizations(visibleOrganizations as OrganizationLike[]),
    [visibleOrganizations]
  );

  const selectedOrgCount = filters.organizations?.length ?? 0;

  const renderOrgButton = (org: OrganizationLike, className?: string) => (
    <Button
      key={org._id}
      variant={filters.organizations?.includes(org._id) ? "default" : "outline"}
      size="sm"
      onClick={() => onOrgToggle(org._id)}
      className={cn("w-full justify-start", className)}
    >
      {org.name}
    </Button>
  );

  return (
    <div className="space-y-4 px-4 py-4">
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          When
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {DATE_OPTIONS.map(({ value, label }) => (
            <Button
              key={value}
              variant={filters.dateRange === value ? "default" : "outline"}
              size="sm"
              onClick={() => onDateChange(filters.dateRange === value ? "all" : value)}
              className="capitalize justify-start"
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Monitor className="w-4 h-4 text-muted-foreground" />
          Event Type
        </h3>
        <div className="flex flex-wrap gap-2">
          {MODE_OPTIONS.map(({ value, label }) => (
            <Button
              key={value}
              variant={filters.eventMode?.includes(value) ? "default" : "outline"}
              size="sm"
              onClick={() => onModeToggle(value)}
              className="capitalize"
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          Audience
        </h3>
        <div className="flex flex-wrap gap-2">
          {AUDIENCE_OPTIONS.map((aud) => (
            <Button
              key={aud.value}
              variant={filters.audience?.includes(aud.value) ? "default" : "outline"}
              size="sm"
              onClick={() => onAudienceToggle(aud.value)}
            >
              {aud.label}
            </Button>
          ))}
        </div>
      </div>

      {organizations.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="font-semibold text-sm">Organizations</h3>
            {selectedOrgCount > 0 && (
              <Badge variant="secondary" className="rounded-full text-xs">
                {selectedOrgCount} selected
              </Badge>
            )}
          </div>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={organizationQuery}
              onChange={(event) => onOrganizationQueryChange(event.target.value)}
              placeholder="Search organizations"
              className="h-8 pl-8"
            />
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-2">
            {visibleOrganizations.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
                No organizations match this search.
              </p>
            ) : (
              <div className="space-y-3">
                {grouped.councils.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Councils
                    </p>
                    {grouped.councils.map((c) => (
                      <div key={c._id} className="space-y-1">
                        {renderOrgButton(c)}
                        {(grouped.clubsByCouncil.get(c._id) || []).map((club) =>
                          renderOrgButton(club, "ml-4 text-xs")
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {grouped.orphanClubs.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Clubs
                    </p>
                    {grouped.orphanClubs.map((c) => renderOrgButton(c))}
                  </div>
                )}

                {grouped.festivals.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Festivals
                    </p>
                    {grouped.festivals.map((f) => renderOrgButton(f))}
                  </div>
                )}

                {grouped.others.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Others
                    </p>
                    {grouped.others.map((o) => renderOrgButton(o))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
