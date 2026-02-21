import { Link, useLocation } from "react-router-dom";
import { CalendarDays, Home, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth.ts";
import { cn } from "@/lib/utils.ts";

const items = [
  { to: "/feed", label: "Feed", icon: Home },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/profile", label: "Profile", icon: User },
];

export default function MobileNav() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const visibleItems = isAuthenticated ? items : items.filter((i) => i.to !== "/profile");

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur-md sm:hidden"
      aria-label="Primary"
    >
      <div className="flex items-center justify-around px-2 py-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors",
                isActive && "text-primary"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
