import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input.tsx";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { cn } from "@/lib/utils.ts";

const MAX_SEARCH_LENGTH = 200;

// Detect if a query looks like code (minified JS, etc.)
function isSuspiciousQuery(query: string): boolean {
  if (!query || query.length < 10) return false;
  
  // Check for common code patterns
  const suspiciousPatterns = [
    /function\s*\(/i,           // function(
    /=>\s*\{/,                  // =>
    /var\s+\w+\s*=/,            // var x =
    /const\s+\w+\s*=/,          // const x =
    /let\s+\w+\s*=/,            // let x =
    /\.current\s*=/,            // .current =
    /Date\.now\(\)/,            // Date.now()
    /\.addEventListener/,       // .addEventListener
    /\.slice\.call/,            // .slice.call
    /void\s+0/,                 // void 0
    /null\s*==/,                 // null ==
    /undefined/,                // undefined
    /\.flush\(\)/,              // .flush()
    /global\.document/,         // global.document
  ];
  
  // Count suspicious patterns
  const matchCount = suspiciousPatterns.filter(pattern => pattern.test(query)).length;
  
  // If 3+ patterns match, it's likely code
  if (matchCount >= 3) return true;
  
  // Check for very high ratio of special characters (common in minified code)
  const specialCharCount = (query.match(/[{}();=,.\s]/g) || []).length;
  const specialCharRatio = specialCharCount / query.length;
  if (specialCharRatio > 0.3 && query.length > 50) return true;
  
  // Check for repeated patterns (common in minified code)
  const repeatedPattern = /(.{10,})\1{2,}/.test(query);
  if (repeatedPattern && query.length > 100) return true;
  
  return false;
}

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onBlur?: () => void;
  compact?: boolean;
}

export function SearchBar({
  className,
  placeholder = "Search events, organizations, tags...",
  autoFocus,
  onBlur,
  compact = false,
}: SearchBarProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Helper to sanitize query
  const sanitizeQuery = (raw: string): string => {
    if (!raw) return "";
    let sanitized = raw;
    if (sanitized.length > MAX_SEARCH_LENGTH) {
      sanitized = sanitized.slice(0, MAX_SEARCH_LENGTH);
    }
    if (isSuspiciousQuery(sanitized)) {
      return "";
    }
    return sanitized;
  };
  
  const rawInitial = searchParams.get("search") || "";
  const [query, setQuery] = useState(() => sanitizeQuery(rawInitial));
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = query.trim().slice(0, MAX_SEARCH_LENGTH);
  const debouncedQuery = useDebounce(trimmed, 300);

  // Sync query from URL params and auto-clear suspicious queries
  useEffect(() => {
    const currentRaw = searchParams.get("search") || "";
    const sanitized = sanitizeQuery(currentRaw);
    
    // If query was suspicious and cleared, update URL
    if (currentRaw && sanitized === "" && isSuspiciousQuery(currentRaw)) {
      const params = new URLSearchParams(searchParams);
      params.delete("search");
      navigate(`/feed?${params.toString()}`, { replace: true });
    }
    
    setQuery(sanitized);
  }, [searchParams, navigate]);

  useEffect(() => {
    const currentSearch = searchParams.get("search") || "";
    
    // Don't navigate if query is suspicious
    if (isSuspiciousQuery(debouncedQuery)) {
      setQuery("");
      const params = new URLSearchParams(searchParams);
      params.delete("search");
      navigate(`/feed?${params.toString()}`, { replace: true });
      return;
    }
    
    if (debouncedQuery.length >= 2 && debouncedQuery !== currentSearch) {
      navigate(`/feed?search=${encodeURIComponent(debouncedQuery)}`, {
        replace: true,
      });
    } else if (debouncedQuery.length === 0 && currentSearch) {
      navigate("/feed", { replace: true });
    }
  }, [debouncedQuery, searchParams, navigate]);

  const handleClear = () => {
    setQuery("");
    navigate("/feed", { replace: true });
    inputRef.current?.focus();
  };

  return (
    <div
      className={cn(
        "relative flex items-center",
        "rounded-xl bg-muted/50 border border-border/50",
        "transition-all duration-200",
        isFocused && "border-primary/50 ring-2 ring-primary/20 bg-background",
        compact ? "h-9" : "h-10",
        className
      )}
    >
      <Search className="absolute left-3 w-4 h-4 text-muted-foreground shrink-0" />
      <Input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value.slice(0, MAX_SEARCH_LENGTH))}
        maxLength={MAX_SEARCH_LENGTH}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          onBlur?.();
        }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={cn(
          "border-0 bg-transparent pl-10 pr-10 h-full focus-visible:ring-0 focus-visible:ring-offset-0",
          compact ? "text-sm" : "text-sm"
        )}
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
