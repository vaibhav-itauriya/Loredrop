import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { useAuth } from "@/hooks/use-auth.ts";
import { Menu, Moon, Sun, UserPlus, LogOut, Building2, ShieldCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useThemeFlip } from "@/components/providers/theme.tsx";
import NotificationBell from "@/components/NotificationBell.tsx";
import { organizationsAPI, authAPI } from "@/lib/api";
import { buildOrganizationOptions } from "@/lib/org-hierarchy.ts";
import platformLogo from "@/Gemini_Generated_Image_wwu3p2wwu3p2wwu3-removebg-preview.png";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { toast } from "sonner";

type FeedHeaderProps = {
  isForYouActive?: boolean;
  isSubscribedActive?: boolean;
  activeMode?: "forYou" | "subscribed" | "trending" | "upcoming";
  activeFilterCount?: number;
  onSelectForYou?: () => void;
  onSelectSubscribed?: () => void;
  onSelectTrending?: () => void;
  onSelectUpcoming?: () => void;
};

export default function FeedHeader({
  isForYouActive = true,
  isSubscribedActive = false,
  activeMode = "forYou",
  activeFilterCount = 0,
  onSelectForYou,
  onSelectSubscribed,
  onSelectTrending,
  onSelectUpcoming,
}: FeedHeaderProps) {
  const { user, isAuthenticated, removeUser } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { flipTheme } = useThemeFlip();
  const [isOrgMember, setIsOrgMember] = useState(false);
  const [isMainAdmin, setIsMainAdmin] = useState(false);
  const [manageableOrgSlug, setManageableOrgSlug] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [checkingMembership, setCheckingMembership] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Check if user is org member and if main admin (mukunds23@iitk.ac.in)
  useEffect(() => {
    if (isAuthenticated && user) {
      const checkAccess = async () => {
        try {
          setCheckingMembership(true);
          const [profileRes, membershipData] = await Promise.all([
            authAPI.getProfile().catch(() => ({ isMainAdmin: false })),
            organizationsAPI.getUserMemberships(),
          ]);
          const manageableOrg =
            (membershipData?.organizations || []).find((org: any) =>
              ["owner", "admin", "moderator"].includes(org?.role)
            ) || membershipData?.organizations?.[0];
          setIsMainAdmin(!!(profileRes as any).isMainAdmin);
          setIsOrgMember(membershipData.isMember);
          setManageableOrgSlug(manageableOrg?.slug || null);
        } catch (err) {
          console.error('Failed to check access:', err);
          setIsOrgMember(false);
          setIsMainAdmin(false);
          setManageableOrgSlug(null);
        } finally {
          setCheckingMembership(false);
        }
      };
      checkAccess();
    } else {
      setIsOrgMember(false);
      setIsMainAdmin(false);
      setManageableOrgSlug(null);
    }
  }, [isAuthenticated, user]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await removeUser();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    if (!isExiting) return;
    const timeout = window.setTimeout(() => setIsExiting(false), 450);
    return () => window.clearTimeout(timeout);
  }, [isExiting]);

  const navigateWithHeaderExit = (path: string) => {
    if (isExiting) return;
    setIsExiting(true);
    window.setTimeout(() => {
      navigate(path);
    }, 220);
  };

  const handleExitLinkClick =
    (path: string) => (event: React.MouseEvent<HTMLElement>) => {
      event.preventDefault();
      navigateWithHeaderExit(path);
    };


  return (
    <motion.header
      initial={{ y: -18, opacity: 0 }}
      animate={isExiting ? { y: -26, opacity: 0, filter: "blur(6px)" } : { y: 0, opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="sticky top-0 z-50 border-b border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,255,255,0.78))] shadow-[0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(15,23,42,0.78))] dark:shadow-[0_10px_30px_rgba(2,6,23,0.35)]"
    >
      <div className="mx-auto w-full max-w-[1880px] px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" onClick={handleExitLinkClick("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src={platformLogo} alt="Loredrop logo" className="h-9 w-9 object-contain" />
            <span
              className="text-xl font-bold tracking-tight hidden sm:block"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Loredrop
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-2 rounded-full border border-border/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.9),rgba(248,250,252,0.75))] px-2.5 py-2 shadow-[0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur dark:bg-[linear-gradient(145deg,rgba(30,41,59,0.88),rgba(15,23,42,0.78))] dark:shadow-[0_14px_34px_rgba(2,6,23,0.28)]">
            <Button
              variant={isForYouActive ? "default" : "ghost"}
              size="sm"
              className="rounded-full px-4 shadow-sm"
              onClick={onSelectForYou}
            >
              Home
            </Button>
            <Button
              variant={isSubscribedActive ? "default" : "ghost"}
              size="sm"
              className="rounded-full px-4 shadow-sm"
              onClick={onSelectSubscribed}
            >
              For You
            </Button>
            <Button
              variant={activeMode === "trending" ? "default" : "ghost"}
              size="sm"
              className="rounded-full px-4 shadow-sm"
              onClick={onSelectTrending}
            >
              Trending
            </Button>
            <Button
              variant={activeMode === "upcoming" ? "default" : "ghost"}
              size="sm"
              className="rounded-full px-4 shadow-sm"
              onClick={onSelectUpcoming}
            >
              Upcoming
            </Button>
            {activeFilterCount > 0 && (
              <Badge variant="outline" className="rounded-full border-border/70 bg-background/70 px-3 py-1 shadow-sm">
                {activeFilterCount} filters
              </Badge>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.08, ease: "easeOut" }}
            className="flex items-center gap-2"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={flipTheme}
              title="Toggle theme"
            >
              {theme === "light" ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </Button>

            {isAuthenticated && <NotificationBell />}

            {isAuthenticated ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user?.avatar} alt={user?.displayName || user?.email} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-medium text-sm">
                          {user?.displayName?.charAt(0) || user?.email?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <Link to="/profile" onClick={handleExitLinkClick("/profile")}>
                      <DropdownMenuItem>My Profile</DropdownMenuItem>
                    </Link>
                    {manageableOrgSlug && (
                      <Link to={`/organizations/${manageableOrgSlug}/manage`} onClick={handleExitLinkClick(`/organizations/${manageableOrgSlug}/manage`)}>
                        <DropdownMenuItem>Manage Organization</DropdownMenuItem>
                      </Link>
                    )}
                    {isMainAdmin && (
                      <Link to="/admin" onClick={handleExitLinkClick("/admin")}>
                        <DropdownMenuItem>Admin Dashboard</DropdownMenuItem>
                      </Link>
                    )}
                    {!isMainAdmin && isOrgMember && (
                      <Link to="/admin" onClick={handleExitLinkClick("/admin")}>
                        <DropdownMenuItem>Create Event</DropdownMenuItem>
                      </Link>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowRequestModal(true)} className="gap-2">
                      <UserPlus className="w-4 h-4" />
                      Request Organization Access
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut} className="gap-2 text-destructive">
                      <LogOut className="w-4 h-4" />
                      {isLoggingOut ? "Logging out..." : "Logout"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <SignInButton>
                <Button size="sm" className="shadow-[0_10px_24px_rgba(99,102,241,0.2)]">Sign In</Button>
              </SignInButton>
            )}

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="sm:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="flex flex-col gap-4 mt-8">
                  {isAuthenticated && (
                    <div className="flex items-center gap-3 pb-4 border-b border-border">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={user?.avatar} alt={user?.displayName || user?.email} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-medium">
                          {user?.displayName?.charAt(0) || user?.email?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user?.displayName}</p>
                        <p className="text-sm text-muted-foreground">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                  )}
                  <Link
                    to="/feed"
                    className="py-2 text-sm font-medium hover:text-primary transition-colors"
                  >
                    For You
                  </Link>
                  <Link
                    to="/feed?filter=upcoming"
                    className="py-2 text-sm font-medium hover:text-primary transition-colors"
                  >
                    Upcoming Events
                  </Link>
                  <Link
                    to="/calendar"
                    onClick={handleExitLinkClick("/calendar")}
                    className="py-2 text-sm font-medium hover:text-primary transition-colors"
                  >
                    My Calendar
                  </Link>
                  {isAuthenticated && (
                    <>
                      <Link
                        to="/profile"
                        onClick={handleExitLinkClick("/profile")}
                        className="py-2 text-sm font-medium hover:text-primary transition-colors"
                      >
                        My Profile
                      </Link>
                      {manageableOrgSlug && (
                        <Link
                          to={`/organizations/${manageableOrgSlug}/manage`}
                          onClick={handleExitLinkClick(`/organizations/${manageableOrgSlug}/manage`)}
                          className="py-2 text-sm font-medium hover:text-primary transition-colors"
                        >
                          Manage Organization
                        </Link>
                      )}
                      {isMainAdmin && (
                        <Link
                          to="/admin"
                          onClick={handleExitLinkClick("/admin")}
                          className="py-2 text-sm font-medium hover:text-primary transition-colors"
                        >
                          Admin Dashboard
                        </Link>
                      )}
                      {!isMainAdmin && isOrgMember && (
                        <Link
                          to="/admin"
                          onClick={handleExitLinkClick("/admin")}
                          className="py-2 text-sm font-medium hover:text-primary transition-colors"
                        >
                          Create Event
                        </Link>
                      )}
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </motion.div>
        </div>

      </div>
      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent className="max-w-[min(92vw,34rem)] overflow-hidden rounded-[1.75rem] border-border/70 bg-[linear-gradient(180deg,rgba(255,250,242,0.98),rgba(255,255,255,0.98))] p-0 shadow-[0_28px_90px_rgba(15,23,42,0.22)] dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.98),rgba(15,23,42,0.98))]">
          <DialogHeader className="border-b border-border/60 px-6 py-5 text-left">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-xl">Request Organization Access</DialogTitle>
                <DialogDescription className="max-w-md text-sm leading-6">
                  Pick the organization you want to join. Your request goes to admins for review and usually gets a response within 24 hours.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 py-5">
            <div className="mb-4 rounded-[1.25rem] border border-emerald-200/70 bg-emerald-50/80 p-4 text-sm text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <p>Use your IITK account to request organizer access for a club, council, festival, or department workspace.</p>
              </div>
            </div>
            <OrganizationRequestForm onClose={() => setShowRequestModal(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </motion.header>
  );
}

// Organization Request Form Component
function OrganizationRequestForm({ onClose }: { onClose: () => void }) {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const orgs = await organizationsAPI.list();
        setOrganizations(orgs);
      } catch (err) {
        console.error('Failed to fetch organizations:', err);
        setError('Could not load organizations right now.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrgs();
  }, []);

  const handleSubmit = async () => {
    if (!selectedOrgId) return;

    try {
      setIsSubmitting(true);
      setError(null);
      const token = localStorage.getItem('authToken');
      const apiBaseUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'http://localhost:3001/api');
      const response = await fetch(`${apiBaseUrl}/organization-requests/${selectedOrgId}/request-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('Request sent successfully');
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to send request');
      }
    } catch (err) {
      console.error('Error sending request:', err);
      setError('Failed to send request');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading organizations...</p>;
  }

  const options = buildOrganizationOptions(organizations);
  const selectedLabel = options.find((opt) => opt.id === selectedOrgId)?.label;

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Choose organization</p>
        <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
          <SelectTrigger className="h-12 w-full rounded-2xl border-border/70 bg-background/90 px-4 text-left shadow-sm">
            <SelectValue placeholder="Select an organization" />
          </SelectTrigger>
          <SelectContent
            position="popper"
            sideOffset={8}
            className="max-h-80 w-[var(--radix-select-trigger-width)] rounded-2xl border-border/70 bg-background/98 p-2 shadow-[0_18px_48px_rgba(15,23,42,0.18)] backdrop-blur-xl"
          >
            {options.map((opt) => (
              <SelectItem
                key={opt.id}
                value={opt.id}
                disabled={opt.disabled}
                className={`min-h-10 rounded-xl px-3 ${opt.disabled ? "font-semibold uppercase tracking-[0.18em] text-[11px] text-muted-foreground" : ""}`}
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedLabel ? <p className="text-xs text-muted-foreground">Selected: {selectedLabel}</p> : null}
      </div>

      <DialogFooter className="pt-2">
        <Button variant="outline" className="rounded-full" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          className="rounded-full px-6 shadow-[0_12px_30px_rgba(14,116,144,0.18)]"
          onClick={handleSubmit}
          disabled={!selectedOrgId || isSubmitting}
        >
          {isSubmitting ? 'Sending...' : 'Send Request'}
        </Button>
      </DialogFooter>
    </div>
  );
}
