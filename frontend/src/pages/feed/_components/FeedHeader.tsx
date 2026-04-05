import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { useAuth } from "@/hooks/use-auth.ts";
import { Menu, Moon, Sun, UserPlus, LogOut, Sparkles, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";

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
  const { theme, setTheme } = useTheme();
  const [isOrgMember, setIsOrgMember] = useState(false);
  const [isMainAdmin, setIsMainAdmin] = useState(false);
  const [manageableOrgSlug, setManageableOrgSlug] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [checkingMembership, setCheckingMembership] = useState(false);

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


  return (
    <motion.header
      initial={{ y: -18, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="sticky top-0 z-50 border-b border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,255,255,0.78))] shadow-[0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl"
    >
      <div className="mx-auto w-full max-w-[1880px] px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src={platformLogo} alt="Loredrop logo" className="h-9 w-9 object-contain" />
            <span
              className="text-xl font-bold tracking-tight hidden sm:block"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Loredrop
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-2 rounded-full border border-white/55 bg-[linear-gradient(145deg,rgba(255,255,255,0.9),rgba(248,250,252,0.75))] px-2.5 py-2 shadow-[0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur">
            <Button
              variant={isForYouActive ? "default" : "ghost"}
              size="sm"
              className="rounded-full px-4 shadow-sm"
              onClick={onSelectForYou}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              For You
            </Button>
            <Button
              variant={isSubscribedActive ? "default" : "ghost"}
              size="sm"
              className="rounded-full px-4 shadow-sm"
              onClick={onSelectSubscribed}
            >
              <Check className="mr-2 h-4 w-4" />
              Subscribed
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
              <Badge variant="outline" className="rounded-full border-white/70 bg-white/70 px-3 py-1 shadow-sm">
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
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
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
                    <Link to="/profile">
                      <DropdownMenuItem>My Profile</DropdownMenuItem>
                    </Link>
                    {manageableOrgSlug && (
                      <Link to={`/organizations/${manageableOrgSlug}/manage`}>
                        <DropdownMenuItem>Manage Organization</DropdownMenuItem>
                      </Link>
                    )}
                    {isMainAdmin && (
                      <Link to="/admin">
                        <DropdownMenuItem>Admin Dashboard</DropdownMenuItem>
                      </Link>
                    )}
                    {!isMainAdmin && isOrgMember && (
                      <Link to="/admin">
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
                    className="py-2 text-sm font-medium hover:text-primary transition-colors"
                  >
                    My Calendar
                  </Link>
                  {isAuthenticated && (
                    <>
                      <Link
                        to="/profile"
                        className="py-2 text-sm font-medium hover:text-primary transition-colors"
                      >
                        My Profile
                      </Link>
                      {manageableOrgSlug && (
                        <Link
                          to={`/organizations/${manageableOrgSlug}/manage`}
                          className="py-2 text-sm font-medium hover:text-primary transition-colors"
                        >
                          Manage Organization
                        </Link>
                      )}
                      {isMainAdmin && (
                        <Link
                          to="/admin"
                          className="py-2 text-sm font-medium hover:text-primary transition-colors"
                        >
                          Admin Dashboard
                        </Link>
                      )}
                      {!isMainAdmin && isOrgMember && (
                        <Link
                          to="/admin"
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

      {/* Request Organization Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold mb-4">Request Organization Access</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Select an organization to request access. Admins will review your request and respond within 24 hours.
            </p>
            <OrganizationRequestForm onClose={() => setShowRequestModal(false)} />
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => setShowRequestModal(false)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </motion.header>
  );
}

// Organization Request Form Component
function OrganizationRequestForm({ onClose }: { onClose: () => void }) {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const orgs = await organizationsAPI.list();
        setOrganizations(orgs);
      } catch (err) {
        console.error('Failed to fetch organizations:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrgs();
  }, []);

  const handleSubmit = async () => {
    if (!selectedOrgId) return;

    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/organization-requests/${selectedOrgId}/request-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert('Request sent successfully! Admins will review it soon.');
        onClose();
        // Refresh membership status
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to send request');
      }
    } catch (err) {
      console.error('Error sending request:', err);
      alert('Failed to send request');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading organizations...</p>;
  }

  const options = buildOrganizationOptions(organizations);

  return (
    <div className="space-y-3">
      <select
        value={selectedOrgId}
        onChange={(e) => setSelectedOrgId(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm"
      >
        <option value="">Select an organization</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={!selectedOrgId || isLoading}
      >
        Send Request
      </Button>
    </div>
  );
}
