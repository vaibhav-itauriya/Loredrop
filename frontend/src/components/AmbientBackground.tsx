import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils.ts";

type AmbientVariant = "landing" | "auth" | "dashboard";

const variantMap: Record<AmbientVariant, string[]> = {
  landing: [
    "top-[8%] left-[6%] h-72 w-72 bg-[rgba(114,78,255,0.18)]",
    "top-[22%] right-[8%] h-64 w-64 bg-[rgba(255,163,77,0.16)] [animation-delay:-7s]",
    "bottom-[10%] left-[20%] h-80 w-80 bg-[rgba(114,78,255,0.12)] [animation-delay:-14s]",
    "bottom-[18%] right-[18%] h-56 w-56 bg-[rgba(255,163,77,0.14)] [animation-delay:-4s]",
  ],
  auth: [
    "top-[14%] left-[12%] h-64 w-64 bg-[rgba(114,78,255,0.14)]",
    "top-[40%] right-[12%] h-52 w-52 bg-[rgba(255,163,77,0.12)] [animation-delay:-9s]",
    "bottom-[12%] left-[28%] h-56 w-56 bg-[rgba(114,78,255,0.09)] [animation-delay:-15s]",
  ],
  dashboard: [
    "top-[10%] left-[5%] h-60 w-60 bg-[rgba(114,78,255,0.13)]",
    "top-[18%] right-[10%] h-48 w-48 bg-[rgba(255,163,77,0.11)] [animation-delay:-8s]",
    "bottom-[14%] right-[16%] h-64 w-64 bg-[rgba(114,78,255,0.08)] [animation-delay:-16s]",
  ],
};

function getVariant(pathname: string): AmbientVariant {
  if (pathname === "/") return "landing";
  if (pathname.startsWith("/auth")) return "auth";
  return "dashboard";
}

export default function AmbientBackground() {
  const location = useLocation();
  const variant = getVariant(location.pathname);
  const orbs = useMemo(() => variantMap[variant], [variant]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-10 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.28),transparent_38%),linear-gradient(180deg,transparent,rgba(255,255,255,0.03))] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_32%),linear-gradient(180deg,transparent,rgba(255,255,255,0.015))]" />
      <div className="ambient-grid absolute inset-0 opacity-[0.78] dark:opacity-[0.42]" />
      <div className="absolute inset-0">
        {orbs.map((orbClassName) => (
          <span
            key={orbClassName}
            className={cn(
              "ambient-orb absolute rounded-full blur-3xl",
              orbClassName,
            )}
          />
        ))}
      </div>
      <div className="absolute inset-0 ambient-noise opacity-[0.22] dark:opacity-[0.1]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
    </div>
  );
}
