import { AuthProvider } from "./auth.tsx";
import { QueryClientProvider } from "./query-client.tsx";
import { ThemeProvider } from "./theme.tsx";
import { Toaster } from "../ui/sonner.tsx";
import { TooltipProvider } from "../ui/tooltip.tsx";
import { SessionAuthProvider } from "@/hooks/use-auth.ts";

import { VideoPlayerProvider } from "./video-player.tsx";

export function DefaultProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SessionAuthProvider>
        <QueryClientProvider>
          <TooltipProvider>
            <ThemeProvider>
              <VideoPlayerProvider>
                <Toaster />
                {children}
              </VideoPlayerProvider>
            </ThemeProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </SessionAuthProvider>
    </AuthProvider>
  );
}
