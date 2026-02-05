import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { X, Filter, ChevronDown, Calendar, Monitor, Users } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet.tsx";
import { cn } from "@/lib/utils.ts";

export interface FilterOptions {
  dateRange?: "today" | "tomorrow" | "week" | "month" | "all";
  eventMode?: ("online" | "offline" | "hybrid")[];
  audience?: ("UG" | "PG" | "PhD" | "Faculty" | "Staff")[];
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

const AUDIENCE_OPTIONS = ["UG", "PG", "PhD", "Faculty", "Staff"] as const;

export function EventFilters({
  onFilterChange,
  currentFilters = {},
  organizations = [],
  variant = "inline",
}: EventFiltersProps) {
  const [filters, setFilters] = useState<FilterOptions>(currentFilters);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    setFilters(currentFilters);
  }, [currentFilters]);

  const handleDateChange = (range: string) => {
    const newValue = range === "all" || filters.dateRange === range ? undefined : (range as FilterOptions["dateRange"]);
    const newFilters = { ...filters, dateRange: newValue };
    setFilters(newFilters);
    onFilterChange(newFilters);
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
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleAudienceToggle = (
    aud: "UG" | "PG" | "PhD" | "Faculty" | "Staff"
  ) => {
    const audience = filters.audience || [];
    const newAudience = audience.includes(aud)
      ? audience.filter((a) => a !== aud)
      : [...audience, aud];
    const newFilters = {
      ...filters,
      audience: newAudience.length > 0 ? newAudience : undefined,
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleOrgToggle = (orgId: string) => {
    const orgs = filters.organizations || [];
    const newOrgs = orgs.includes(orgId)
      ? orgs.filter((o) => o !== orgId)
      : [...orgs, orgId];
    const newFilters = {
      ...filters,
      organizations: newOrgs.length > 0 ? newOrgs : undefined,
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleClearAll = () => {
    const emptyFilters: FilterOptions = {};
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
    setSheetOpen(false);
  };

  const hasActiveFilters =
    (filters.dateRange && filters.dateRange !== "all") ||
    (filters.eventMode?.length ?? 0) > 0 ||
    (filters.audience?.length ?? 0) > 0 ||
    (filters.organizations?.length ?? 0) > 0;

  const activeFilterCount = [
    filters.dateRange && filters.dateRange !== "all" ? 1 : 0,
    filters.eventMode?.length ?? 0,
    filters.audience?.length ?? 0,
    filters.organizations?.length ?? 0,
  ].reduce((a, b) => a + b, 0);

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

  if (variant === "sheet") {
    return (
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
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
        </SheetTrigger>
        <SheetContent side="left" className="w-full sm:w-96 overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle>Filter Events</SheetTitle>
              {hasActiveFilters && (
                <Button size="sm" variant="ghost" onClick={handleClearAll}>
                  Clear all
                </Button>
              )}
            </div>
          </SheetHeader>
          <FilterFormContent
            filters={filters}
            organizations={organizations}
            onDateChange={handleDateChange}
            onModeToggle={handleModeToggle}
            onAudienceToggle={handleAudienceToggle}
            onOrgToggle={handleOrgToggle}
          />
        </SheetContent>
      </Sheet>
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

      {/* More filters - Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "relative h-8",
              hasActiveFilters && "border-primary/50 bg-primary/5"
            )}
          >
            <Filter className="w-4 h-4 mr-1.5" />
            More
            {activeFilterCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-1.5 h-4 min-w-4 px-1 rounded-full text-[10px] bg-primary/20 text-primary"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-full sm:w-96 overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle>Filter Events</SheetTitle>
              {hasActiveFilters && (
                <Button size="sm" variant="ghost" onClick={handleClearAll}>
                  <X className="w-4 h-4 mr-1" />
                  Clear all
                </Button>
              )}
            </div>
          </SheetHeader>
          <FilterFormContent
            filters={filters}
            organizations={organizations}
            onDateChange={handleDateChange}
            onModeToggle={handleModeToggle}
            onAudienceToggle={handleAudienceToggle}
            onOrgToggle={handleOrgToggle}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function FilterFormContent({
  filters,
  organizations,
  onDateChange,
  onModeToggle,
  onAudienceToggle,
  onOrgToggle,
}: {
  filters: FilterOptions;
  organizations: { _id: string; name: string }[];
  onDateChange: (range: string) => void;
  onModeToggle: (mode: "online" | "offline" | "hybrid") => void;
  onAudienceToggle: (aud: "UG" | "PG" | "PhD" | "Faculty" | "Staff") => void;
  onOrgToggle: (orgId: string) => void;
}) {
  return (
    <div className="space-y-6 mt-6">
      <div>
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

      <div>
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

      <div>
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          Audience
        </h3>
        <div className="flex flex-wrap gap-2">
          {AUDIENCE_OPTIONS.map((aud) => (
            <Button
              key={aud}
              variant={filters.audience?.includes(aud) ? "default" : "outline"}
              size="sm"
              onClick={() => onAudienceToggle(aud)}
            >
              {aud}
            </Button>
          ))}
        </div>
      </div>

      {organizations.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-3">Organizations</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {organizations.map((org) => (
              <Button
                key={org._id}
                variant={
                  filters.organizations?.includes(org._id) ? "default" : "outline"
                }
                size="sm"
                onClick={() => onOrgToggle(org._id)}
                className="w-full justify-start"
              >
                {org.name}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
