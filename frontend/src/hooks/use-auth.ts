import { useState, useEffect } from "react";

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isConfigured] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('authToken');
      
      if (storedUser && storedToken) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        console.log('✓ User loaded from storage:', userData.email);
      }
    } catch (err) {
      console.error('Error loading user from storage:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signinRedirect = async () => {
    // Redirect to login page (users can choose to login or verify email)
    window.location.href = '/auth/login';
  };

  const removeUser = async () => {
    setIsLoading(true);
    setError(null);
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      setUser(null);
      console.log('✓ User logged out');
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error("Sign out error:", error);
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



