import { useState, useEffect } from "react";
import { authAPI } from "@/lib/api";

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isConfigured] = useState(true);

  useEffect(() => {
    const syncUserFromStorage = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        const storedToken = localStorage.getItem("authToken");

        if (storedUser && storedToken) {
          try {
            const profile = await authAPI.getProfile();
            setUser(profile);
            localStorage.setItem("user", JSON.stringify(profile));
          } catch (err: any) {
            localStorage.removeItem("authToken");
            localStorage.removeItem("user");
            setUser(null);
          }
          return;
        }

        setUser(null);
      } catch (err) {
        console.error("Error loading user from storage:", err);
      }
    };

    try {
      void syncUserFromStorage();
    } finally {
      setIsLoading(false);
    }

    const handleSync = () => {
      void syncUserFromStorage();
    };

    window.addEventListener("storage", handleSync);
    window.addEventListener("auth-state-changed", handleSync as EventListener);
    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("auth-state-changed", handleSync as EventListener);
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
      window.dispatchEvent(new Event("auth-state-changed"));
      setUser(null);
    } catch (err) {
      const nextError = err as Error;
      setError(nextError);
      console.error("Sign out error:", nextError);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    signinRedirect,
    removeUser,
    useUser: () => user,
    isConfigured,
  };
}
