import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner.tsx";
import { useAuth } from "@/hooks/use-auth.ts";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Redirect to feed after user is authenticated
    if (!isLoading && user) {
      console.log("User authenticated, redirecting to feed");
      navigate("/feed", { replace: true });
    }
  }, [user, isLoading, navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-svh gap-4">
      <Spinner className="size-8" />
      <p className="text-sm text-muted-foreground">
        {isLoading ? "Authenticating..." : "Redirecting..."}
      </p>
    </div>
  );
}


