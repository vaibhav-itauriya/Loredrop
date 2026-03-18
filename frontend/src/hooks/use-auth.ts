import { useState, useEffect } from "react";

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isConfigured] = useState(true);

  useEffect(() => {
    const syncUserFromStorage = () => {
      try {
        const storedUser = localStorage.getItem("user");
        const storedToken = localStorage.getItem("authToken");

        if (storedUser && storedToken) {
          setUser(JSON.parse(storedUser));
          return;
        }

        setUser(null);
      } catch (err) {
        console.error("Error loading user from storage:", err);
      }
    };

    try {
      syncUserFromStorage();
    } finally {
      setIsLoading(false);
    }

    window.addEventListener("storage", syncUserFromStorage);
    window.addEventListener("auth-state-changed", syncUserFromStorage as EventListener);
    return () => {
      window.removeEventListener("storage", syncUserFromStorage);
      window.removeEventListener("auth-state-changed", syncUserFromStorage as EventListener);
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
