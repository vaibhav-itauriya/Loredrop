import { useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { X, Filter } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet.tsx";

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
}

export function EventFilters({
  onFilterChange,
  currentFilters = {},
  organizations = [],
}: EventFiltersProps) {
  const [filters, setFilters] = useState<FilterOptions>(currentFilters);

  const handleDateChange = (range: string) => {
    const newFilters = {
      ...filters,
      dateRange: range as any,
    };
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
  };

  const hasActiveFilters = Object.values(filters).some(
    (v) => v !== undefined && (Array.isArray(v) ? v.length > 0 : true)
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {hasActiveFilters && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
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

        <div className="space-y-6 mt-6">
          {/* Date Range */}
          <div>
            <h3 className="font-semibold text-sm mb-3">When</h3>
            <div className="grid grid-cols-2 gap-2">
              {["today", "tomorrow", "week", "month", "all"].map((range) => (
                <Button
                  key={range}
                  variant={filters.dateRange === range ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    handleDateChange(
                      filters.dateRange === range ? "all" : range
                    )
                  }
                  className="capitalize"
                >
                  {range === "week"
                    ? "This Week"
                    : range === "month"
                      ? "This Month"
                      : range === "all"
                        ? "Any Time"
                        : range.charAt(0).toUpperCase() + range.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Event Mode */}
          <div>
            <h3 className="font-semibold text-sm mb-3">Event Type</h3>
            <div className="space-y-2">
              {["online", "offline", "hybrid"].map((mode) => (
                <Button
                  key={mode}
                  variant={
                    filters.eventMode?.includes(mode as any)
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => handleModeToggle(mode as any)}
                  className="w-full justify-start capitalize"
                >
                  {mode}
                </Button>
              ))}
            </div>
          </div>

          {/* Audience */}
          <div>
            <h3 className="font-semibold text-sm mb-3">Audience</h3>
            <div className="space-y-2">
              {["UG", "PG", "PhD", "Faculty", "Staff"].map((aud) => (
                <Button
                  key={aud}
                  variant={
                    filters.audience?.includes(aud as any)
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => handleAudienceToggle(aud as any)}
                  className="w-full justify-start"
                >
                  {aud}
                </Button>
              ))}
            </div>
          </div>

          {/* Organizations */}
          {organizations.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-3">Organizations</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {organizations.map((org) => (
                  <Button
                    key={org._id}
                    variant={
                      filters.organizations?.includes(org._id)
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => handleOrgToggle(org._id)}
                    className="w-full justify-start"
                  >
                    {org.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
