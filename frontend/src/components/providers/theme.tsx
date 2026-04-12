import {
  ThemeProvider as NextThemeProvider,
  type ThemeProviderProps,
  useTheme as useNextTheme,
} from "next-themes";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

type ThemeFlipContextValue = {
  flipTheme: () => void;
};

const ThemeFlipContext = createContext<ThemeFlipContextValue | null>(null);

function ThemeFlipLayer({ children }: { children: React.ReactNode }) {
  const { resolvedTheme, setTheme } = useNextTheme();
  const [isFlipping, setIsFlipping] = useState(false);
  const [nextTheme, setNextTheme] = useState<"light" | "dark">("dark");

  const flipTheme = useCallback(() => {
    if (isFlipping) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const currentTheme = resolvedTheme === "dark" ? "dark" : "light";
    const upcomingTheme = currentTheme === "dark" ? "light" : "dark";

    if (prefersReducedMotion) {
      setTheme(upcomingTheme);
      return;
    }

    setNextTheme(upcomingTheme);
    setIsFlipping(true);

    window.setTimeout(() => {
      setTheme(upcomingTheme);
    }, 260);

    window.setTimeout(() => {
      setIsFlipping(false);
    }, 760);
  }, [isFlipping, resolvedTheme, setTheme]);

  const value = useMemo(() => ({ flipTheme }), [flipTheme]);
  const currentTheme = resolvedTheme === "dark" ? "dark" : "light";

  return (
    <ThemeFlipContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {isFlipping && (
          <motion.div
            key={`${currentTheme}-${nextTheme}`}
            aria-hidden="true"
            className="theme-page-flip pointer-events-none fixed inset-0 z-[120] overflow-hidden"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
          >
            <div
              className="theme-page-flip__sheet"
              data-current-theme={currentTheme}
              data-next-theme={nextTheme}
            />
            <div className="theme-page-flip__glow" />
          </motion.div>
        )}
      </AnimatePresence>
    </ThemeFlipContext.Provider>
  );
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="app-theme"
      {...props}
    >
      <ThemeFlipLayer>{children}</ThemeFlipLayer>
    </NextThemeProvider>
  );
}

export function useThemeFlip() {
  const context = useContext(ThemeFlipContext);

  if (!context) {
    throw new Error("useThemeFlip must be used within ThemeProvider");
  }

  return context;
}
