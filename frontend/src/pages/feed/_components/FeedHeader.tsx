import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { useAuth } from "@/hooks/use-auth.ts";
import { Zap, Search, Menu, Moon, Sun, UserPlus, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import NotificationBell from "@/components/NotificationBell.tsx";
import { organizationsAPI } from "@/lib/api";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";

export default function FeedHeader() {
  const { user, isAuthenticated, removeUser } = useAuth();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { theme, setTheme } = useTheme();
  const [isOrgMember, setIsOrgMember] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Check if user is org member
  useEffect(() => {
    if (isAuthenticated && user) {
      const checkOrgMembership = async () => {
        try {
          // Try to fetch if user has any org membership
          // For now, we'll check this when navigating to admin
          setIsOrgMember(false); // Will be checked server-side
        } catch (err) {
          console.error('Failed to check org membership:', err);
        }
      };
      checkOrgMembership();
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/feed?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
      setSearchOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span
              className="text-xl font-bold tracking-tight hidden sm:block"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Loredrop
            </span>
          </Link>

          {/* Search - Desktop */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <form onSubmit={handleSearch} className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search IITK, events, councils..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-muted/50 border border-border/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm transition-all"
              />
            </form>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Mobile Search */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <Search className="w-5 h-5" />
            </Button>

            {/* Theme Toggle */}
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

            {/* Notifications */}
            {isAuthenticated && <NotificationBell />}

            {isAuthenticated ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-medium text-sm">
                        {user?.displayName?.charAt(0) || "U"}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <Link to="/profile">
                      <DropdownMenuItem>My Profile</DropdownMenuItem>
                    </Link>
                    <Link to="/admin">
                      <DropdownMenuItem>Admin Dashboard</DropdownMenuItem>
                    </Link>
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
                <Button size="sm">Sign In</Button>
              </SignInButton>
            )}

            {/* Mobile Menu */}
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
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-medium">
                        {user?.displayName?.charAt(0) || "U"}
                      </div>
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
                      <Link
                        to="/admin"
                        className="py-2 text-sm font-medium hover:text-primary transition-colors"
                      >
                        Admin Dashboard
                      </Link>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {searchOpen && (
          <form onSubmit={handleSearch} className="md:hidden pb-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search IITK, events, councils..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-muted/50 border border-border/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm transition-all"
                autoFocus
              />
            </div>
          </form>
        )}
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
    </header>
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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/organization-requests/${selectedOrgId}/request-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken()}`,
        },
      });

      if (response.ok) {
        alert('Request sent successfully! Admins will review it soon.');
        onClose();
      } else {
        alert('Failed to send request');
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

  return (
    <div className="space-y-3">
      <select
        value={selectedOrgId}
        onChange={(e) => setSelectedOrgId(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm"
      >
        <option value="">Select an organization</option>
        {organizations.map((org) => (
          <option key={org._id} value={org._id}>
            {org.name}
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