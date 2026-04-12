import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ExternalLink,
  ImagePlus,
  Layers,
  PencilLine,
  Settings2,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import EventEditDialog from "@/components/EventEditDialog.tsx";
import { useAuth } from "@/hooks/use-auth.ts";
import { organizationsAPI, eventsAPI } from "@/lib/api";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { toast } from "sonner";

type MembershipOrganization = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  role?: string;
};

type ManagedOrganization = MembershipOrganization & {
  type?: string;
};

const MANAGEABLE_ROLES = new Set(["owner", "admin", "moderator", "member"]);
const BRAND_EDIT_ROLES = new Set(["owner", "admin"]);

export default function OrganizationManagePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [organizations, setOrganizations] = useState<ManagedOrganization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<ManagedOrganization | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingOrg, setSavingOrg] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [orgForm, setOrgForm] = useState({
    name: "",
    slug: "",
    description: "",
    type: "other",
    logo: "",
    coverImage: "",
  });

  const canEditBrand = BRAND_EDIT_ROLES.has(selectedOrg?.role || "");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const membershipData = await organizationsAPI.getUserMemberships();
        const manageable = (membershipData?.organizations || []).filter((org: MembershipOrganization) =>
          MANAGEABLE_ROLES.has(org.role || "")
        );

        if (cancelled) return;

        setOrganizations(manageable);

        if (!manageable.length) {
          setSelectedOrg(null);
          setEvents([]);
          return;
        }

        const nextOrg =
          manageable.find((org: ManagedOrganization) => org.slug === slug) || manageable[0];

        if (!slug || nextOrg.slug !== slug) {
          navigate(`/organizations/${nextOrg.slug}/manage`, { replace: true });
        }

        const [orgDetails, orgEvents] = await Promise.all([
          organizationsAPI.getBySlug(nextOrg.slug),
          eventsAPI.getByOrganization(nextOrg._id),
        ]);

        if (cancelled) return;

        const mergedOrg = { ...nextOrg, ...orgDetails };
        setSelectedOrg(mergedOrg);
        setOrgForm({
          name: mergedOrg.name || "",
          slug: mergedOrg.slug || "",
          description: mergedOrg.description || "",
          type: mergedOrg.type || "other",
          logo: mergedOrg.logo || "",
          coverImage: mergedOrg.coverImage || "",
        });
        setEvents(Array.isArray(orgEvents) ? orgEvents : []);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load organization manager:", error);
          toast.error("Failed to load organization manager");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, navigate, slug]);

  const upcomingCount = useMemo(
    () => events.filter((event) => new Date(event.dateTime) >= new Date()).length,
    [events]
  );

  const refreshSelectedOrganization = async (nextSlug?: string, nextOrgId?: string) => {
    if (!selectedOrg && !nextSlug && !nextOrgId) return;
    const resolvedSlug = nextSlug || selectedOrg?.slug;
    const resolvedOrgId = nextOrgId || selectedOrg?._id;
    if (!resolvedSlug || !resolvedOrgId) return;

    const [orgDetails, orgEvents] = await Promise.all([
      organizationsAPI.getBySlug(resolvedSlug),
      eventsAPI.getByOrganization(resolvedOrgId),
    ]);

    const role = organizations.find((org) => org._id === resolvedOrgId)?.role || selectedOrg?.role;
    const mergedOrg = { ...orgDetails, role };
    setSelectedOrg(mergedOrg);
    setOrganizations((prev) =>
      prev.map((org) =>
        org._id === resolvedOrgId ? { ...org, ...orgDetails, role: org.role } : org
      )
    );
    setOrgForm({
      name: mergedOrg.name || "",
      slug: mergedOrg.slug || "",
      description: mergedOrg.description || "",
      type: mergedOrg.type || "other",
      logo: mergedOrg.logo || "",
      coverImage: mergedOrg.coverImage || "",
    });
    setEvents(Array.isArray(orgEvents) ? orgEvents : []);
  };

  const handleOrganizationSwitch = async (nextSlug: string) => {
    navigate(`/organizations/${nextSlug}/manage`);
  };

  const handleSaveOrganization = async () => {
    if (!selectedOrg || !canEditBrand) return;

    try {
      setSavingOrg(true);
      const updated = await organizationsAPI.updateOrganization(selectedOrg._id, {
        name: orgForm.name,
        slug: orgForm.slug,
        description: orgForm.description,
        type: orgForm.type,
        logo: orgForm.logo,
        coverImage: orgForm.coverImage,
      });
      toast.success("Organization updated");
      await refreshSelectedOrganization(updated.slug, selectedOrg._id);
      if (updated.slug && updated.slug !== slug) {
        navigate(`/organizations/${updated.slug}/manage`, { replace: true });
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to update organization");
    } finally {
      setSavingOrg(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      setDeletingEventId(eventId);
      await eventsAPI.deleteEvent(eventId);
      setEvents((prev) => prev.filter((event) => event._id !== eventId));
      toast.success("Event deleted");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete event");
    } finally {
      setDeletingEventId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="space-y-4">
            <Skeleton className="h-10 w-56" />
            <Skeleton className="h-56 w-full rounded-[2rem]" />
            <Skeleton className="h-96 w-full rounded-[2rem]" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <Card className="rounded-[2rem] border-white/50 bg-white/80 shadow-[0_28px_80px_rgba(15,23,42,0.08)] backdrop-blur">
            <CardHeader>
              <CardTitle>Sign in required</CardTitle>
              <CardDescription>Sign in with your campus account to manage organization pages and events.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (!selectedOrg) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <Link to="/feed">
            <Button variant="ghost" className="mb-4 pl-0">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to feed
            </Button>
          </Link>
          <Card className="rounded-[2rem] border-white/50 bg-white/80 shadow-[0_28px_80px_rgba(15,23,42,0.08)] backdrop-blur">
            <CardHeader>
              <CardTitle>Organization admin access required</CardTitle>
              <CardDescription>You need owner, admin, or moderator access to open organization management.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_34%),linear-gradient(180deg,#f8fbff_0%,#f7f7fb_50%,#f5f7fb_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link to="/feed">
              <Button variant="ghost" className="mb-2 pl-0 text-slate-600">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to feed
              </Button>
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950" style={{ fontFamily: "var(--font-display)" }}>
              Manage Organization
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Update branding, keep the public page polished, and manage event posts without changing your current admin flow.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {organizations.length > 1 && (
              <select
                value={selectedOrg.slug}
                onChange={(e) => handleOrganizationSwitch(e.target.value)}
                className="rounded-full border border-white/70 bg-white/90 px-4 py-2 text-sm shadow-sm"
              >
                {organizations.map((org) => (
                  <option key={org._id} value={org.slug}>
                    {org.name}
                  </option>
                ))}
              </select>
            )}
            <Link to={`/organizations/${selectedOrg.slug}`}>
              <Button variant="outline" className="rounded-full">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Public Page
              </Button>
            </Link>
            <Link to="/admin">
              <Button className="rounded-full shadow-[0_16px_40px_rgba(79,70,229,0.24)]">
                <CalendarDays className="mr-2 h-4 w-4" />
                Create Event
              </Button>
            </Link>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="overflow-hidden rounded-[2rem] border border-white/60 bg-white/75 shadow-[0_30px_90px_rgba(15,23,42,0.08)] backdrop-blur-xl"
        >
          <div
            className="relative min-h-[220px] overflow-hidden border-b border-white/50 bg-[linear-gradient(135deg,#0f3b57_0%,#1a7fa6_38%,#5a4b3e_100%)]"
            style={orgForm.coverImage ? { backgroundImage: `linear-gradient(rgba(15,23,42,0.18),rgba(15,23,42,0.4)), url(${orgForm.coverImage})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.18),transparent_26%)]" />
            <div className="relative flex h-full flex-col justify-end gap-5 p-6 sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-end gap-4">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.75rem] border border-white/40 bg-white/12 shadow-[0_20px_40px_rgba(15,23,42,0.24)] backdrop-blur">
                    {orgForm.logo ? (
                      <img src={orgForm.logo} alt={orgForm.name} className="h-full w-full object-cover" />
                    ) : (
                      <Layers className="h-10 w-10 text-white/90" />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="rounded-full border border-white/25 bg-white/14 text-white shadow-sm backdrop-blur">
                        {selectedOrg.role}
                      </Badge>
                      <Badge className="rounded-full border border-white/25 bg-white/14 text-white shadow-sm backdrop-blur capitalize">
                        {orgForm.type}
                      </Badge>
                    </div>
                    <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white" style={{ fontFamily: "var(--font-display)" }}>
                      {orgForm.name || selectedOrg.name}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm text-white/80">
                      {orgForm.description || "Add a sharper description, visual identity, and cleaner event flow for your organization page."}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 self-start sm:self-end">
                  <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-white backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.24em] text-white/60">Events</p>
                    <p className="mt-2 text-2xl font-semibold">{events.length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-white backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.24em] text-white/60">Upcoming</p>
                    <p className="mt-2 text-2xl font-semibold">{upcomingCount}</p>
                  </div>
                  <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-white backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.24em] text-white/60">Slug</p>
                    <p className="mt-2 truncate text-sm font-semibold">/{orgForm.slug}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-8">
            <Tabs defaultValue="identity" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 rounded-full bg-slate-100/90 p-1">
                <TabsTrigger value="identity" className="rounded-full">Identity</TabsTrigger>
                <TabsTrigger value="branding" className="rounded-full">Banner & Logo</TabsTrigger>
                <TabsTrigger value="events" className="rounded-full">Manage Events</TabsTrigger>
              </TabsList>

              <TabsContent value="identity" className="space-y-6">
                <div className="grid gap-6 xl:grid-cols-[1.35fr_0.8fr]">
                  <Card className="rounded-[1.5rem] border-slate-200/70 bg-white/90 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PencilLine className="h-5 w-5 text-sky-600" />
                        Organization Details
                      </CardTitle>
                      <CardDescription>Edit the public basics students see before they decide to follow or attend.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="org-name">Name</Label>
                          <Input
                            id="org-name"
                            value={orgForm.name}
                            onChange={(e) => setOrgForm((prev) => ({ ...prev, name: e.target.value }))}
                            disabled={!canEditBrand}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="org-type">Type</Label>
                          <select
                            id="org-type"
                            value={orgForm.type}
                            onChange={(e) => setOrgForm((prev) => ({ ...prev, type: e.target.value }))}
                            disabled={!canEditBrand}
                            className="w-full rounded-xl border border-input bg-background px-3 py-2"
                          >
                            <option value="council">Council</option>
                            <option value="club">Club</option>
                            <option value="festival">Festival</option>
                            <option value="department">Department</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="org-slug">Slug</Label>
                        <Input
                          id="org-slug"
                          value={orgForm.slug}
                          onChange={(e) => setOrgForm((prev) => ({ ...prev, slug: e.target.value }))}
                          disabled={!canEditBrand}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="org-description">Description</Label>
                        <Textarea
                          id="org-description"
                          value={orgForm.description}
                          onChange={(e) => setOrgForm((prev) => ({ ...prev, description: e.target.value }))}
                          disabled={!canEditBrand}
                          className="min-h-36"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Button onClick={handleSaveOrganization} disabled={!canEditBrand || savingOrg}>
                          {savingOrg ? "Saving..." : "Save Details"}
                        </Button>
                        {!canEditBrand && (
                          <p className="text-sm text-slate-500">
                            Your current role can manage events here, but only owners/admins can update organization identity.
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-[1.5rem] border-slate-200/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.9))] shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-emerald-600" />
                        Recommended Admin Controls
                      </CardTitle>
                      <CardDescription>These are the core controls most organization admins expect on a public page manager.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-slate-600">
                      <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4">
                        <p className="font-medium text-slate-900">Brand consistency</p>
                        <p className="mt-1">Keep logo, banner, slug, and description fresh so your page feels official and recognizable.</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4">
                        <p className="font-medium text-slate-900">Post management</p>
                        <p className="mt-1">Review older events, edit mistakes, and remove outdated posts that make the org feel inactive.</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4">
                        <p className="font-medium text-slate-900">Fast navigation</p>
                        <p className="mt-1">Jump to the public page for QA and to the admin dashboard when you need to create a new event.</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="branding" className="space-y-6">
                <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                  <Card className="rounded-[1.5rem] border-slate-200/70 bg-white/90 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ImagePlus className="h-5 w-5 text-fuchsia-600" />
                        Banner and Logo
                      </CardTitle>
                      <CardDescription>Paste image URLs for your public header art. This keeps the current storage model intact and adds admin editing today.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="org-cover">Banner URL</Label>
                        <Input
                          id="org-cover"
                          value={orgForm.coverImage}
                          onChange={(e) => setOrgForm((prev) => ({ ...prev, coverImage: e.target.value }))}
                          disabled={!canEditBrand}
                          placeholder="https://..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="org-logo">Logo URL</Label>
                        <Input
                          id="org-logo"
                          value={orgForm.logo}
                          onChange={(e) => setOrgForm((prev) => ({ ...prev, logo: e.target.value }))}
                          disabled={!canEditBrand}
                          placeholder="https://..."
                        />
                      </div>
                      <Button onClick={handleSaveOrganization} disabled={!canEditBrand || savingOrg}>
                        {savingOrg ? "Saving..." : "Save Branding"}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden rounded-[1.5rem] border-slate-200/70 bg-white/90 shadow-sm">
                    <div
                      className="relative h-52 bg-[linear-gradient(135deg,#082f49_0%,#0f766e_40%,#7c2d12_100%)]"
                      style={orgForm.coverImage ? { backgroundImage: `url(${orgForm.coverImage})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                    >
                      <div className="absolute inset-0 bg-black/10" />
                    </div>
                    <CardContent className="relative -mt-12 p-6">
                      <div className="flex items-end gap-4">
                        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.5rem] border-4 border-white bg-slate-100 shadow-lg">
                          {orgForm.logo ? (
                            <img src={orgForm.logo} alt={orgForm.name} className="h-full w-full object-cover" />
                          ) : (
                            <Building2 className="h-10 w-10 text-slate-400" />
                          )}
                        </div>
                        <div className="pb-2">
                          <p className="text-xl font-semibold text-slate-950">{orgForm.name || "Organization Name"}</p>
                          <p className="text-sm text-slate-500">Live preview for the public organization header.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="events" className="space-y-6">
                <Card className="rounded-[1.5rem] border-slate-200/70 bg-white/90 shadow-sm">
                  <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Settings2 className="h-5 w-5 text-amber-600" />
                        Manage Events
                      </CardTitle>
                      <CardDescription>Edit event details, keep the feed clean, and jump to the main event creator when you need a new post.</CardDescription>
                    </div>
                    <Link to="/admin">
                      <Button className="rounded-full">
                        <CalendarDays className="mr-2 h-4 w-4" />
                        Create Another Event
                      </Button>
                    </Link>
                  </CardHeader>
                  <CardContent>
                    {events.length === 0 ? (
                      <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/90 p-8 text-center">
                        <p className="font-medium text-slate-900">No events for this organization yet</p>
                        <p className="mt-2 text-sm text-slate-500">Use the existing admin dashboard to create the first event, then manage edits here.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {events.map((event) => (
                          <div
                            key={event._id}
                            className="rounded-[1.5rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] p-5 shadow-sm"
                          >
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 text-slate-700">
                                    {event.mode || "offline"}
                                  </Badge>
                                  {Array.isArray(event.tags) && event.tags.slice(0, 3).map((tag: string) => (
                                    <Badge key={tag} className="rounded-full bg-slate-900/[0.04] text-slate-700 shadow-none">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                                <h3 className="mt-3 text-xl font-semibold text-slate-950">{event.title}</h3>
                                <p className="mt-2 line-clamp-2 text-sm text-slate-600">{event.description}</p>
                                <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
                                  <span>{new Date(event.dateTime).toLocaleString()}</span>
                                  <span>{event.venue || "Venue TBA"}</span>
                                  <span>{event.capacity ? `${event.capacity} capacity` : "Open capacity"}</span>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <EventEditDialog
                                  event={event}
                                  canEdit
                                  triggerLabel="Edit Event"
                                  onUpdated={(updated) =>
                                    setEvents((prev) =>
                                      prev.map((item) => (item._id === event._id ? { ...item, ...updated } : item))
                                    )
                                  }
                                />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="destructive" disabled={deletingEventId === event._id}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      {deletingEventId === event._id ? "Deleting..." : "Delete"}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete this event?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This removes the post from the feed and clears related interactions for students.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteEvent(event._id)}>
                                        Delete event
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
