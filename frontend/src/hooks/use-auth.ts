import {
  createElement,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authAPI } from "@/lib/api";

type AuthContextValue = {
  user: any;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  signinRedirect: () => Promise<void>;
  removeUser: () => Promise<void>;
  useUser: () => any;
  isConfigured: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function parseStoredUser(raw: string | null) {
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem("user");
    return null;
  }
}

export function SessionAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isConfigured] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const syncUserFromStorage = async () => {
      if (!cancelled) {
        setIsLoading(true);
        setError(null);
      }

      try {
        const storedToken = localStorage.getItem("authToken");
        const parsedStoredUser = parseStoredUser(localStorage.getItem("user"));

        if (!storedToken) {
          if (!cancelled) {
            setUser(null);
          }
          return;
        }

        if (parsedStoredUser && !cancelled) {
          setUser(parsedStoredUser);
        }

        try {
          const profile = await authAPI.getProfile();
          if (cancelled) return;
          setUser(profile);
          localStorage.setItem("user", JSON.stringify(profile));
        } catch (err: any) {
          if (cancelled) return;

          const status = typeof err?.status === "number" ? err.status : null;
          if (status === 401 || status === 403) {
            localStorage.removeItem("authToken");
            localStorage.removeItem("user");
            setUser(null);
          } else if (!parsedStoredUser) {
            setUser(null);
          }

          setError(err instanceof Error ? err : new Error("Failed to refresh auth session"));
        }
      } catch (err) {
        if (!cancelled) {
          const nextError = err instanceof Error ? err : new Error("Failed to load auth state");
          setError(nextError);
          setUser(null);
          console.error("Error loading user from storage:", err);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void syncUserFromStorage();

    const handleSync = () => {
      void syncUserFromStorage();
    };

    window.addEventListener("storage", handleSync);
    window.addEventListener("auth-state-changed", handleSync as EventListener);
    window.addEventListener("focus", handleSync);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("auth-state-changed", handleSync as EventListener);
      window.removeEventListener("focus", handleSync);
    };
  }, []);

  const signinRedirect = async () => {
    window.location.href = "/auth/login";
  };

  const removeUser = async () => {
    setIsLoading(true);
    setError(null);
    try {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      setUser(null);
      window.dispatchEvent(new Event("auth-state-changed"));
    } catch (err) {
      const nextError = err as Error;
      setError(nextError);
      console.error("Sign out error:", nextError);
    } finally {
      setIsLoading(false);
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      error,
      signinRedirect,
      removeUser,
      useUser: () => user,
      isConfigured,
    }),
    [error, isConfigured, isLoading, user],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within SessionAuthProvider");
  }

  return context;
}
