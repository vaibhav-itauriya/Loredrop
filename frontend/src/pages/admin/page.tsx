import { useState, useEffect, type ChangeEvent } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Plus, ArrowLeft, Calendar, Users, X, UserPlus, AlertCircle, Check, XCircle, Shield } from 'lucide-react';
import { eventsAPI, organizationsAPI, authAPI, organizationRequestsAPI } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { buildOrganizationOptions } from '@/lib/org-hierarchy.ts';

interface Organization {
  _id: string;
  name: string;
  slug: string;
  description: string;
  logo?: string;
}

interface PendingRequest {
  _id: string;
  userId: { _id: string; displayName?: string; email: string };
  organizationId: { _id: string; name: string; slug: string };
  status: string;
  requestedAt: string;
}

interface OrganizationAdminsGroup {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  admins: {
    membershipId: string;
    userId: string;
    name: string;
    email: string;
    role: string;
    joinedAt: string;
  }[];
}

interface AnalyticsOverview {
  summary?: {
    totalEvents: number;
    totalSaves: number;
    totalRsvps: number;
    totalCheckIns: number;
  };
}

export default function AdminPage() {
  const { user, isAuthenticated } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isOrgMember, setIsOrgMember] = useState(false);
  const [checkingMembership, setCheckingMembership] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [isMainAdmin, setIsMainAdmin] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [actingRequestId, setActingRequestId] = useState<string | null>(null);
  const [organizationAdmins, setOrganizationAdmins] = useState<OrganizationAdminsGroup[]>([]);
  const [loadingOrgAdmins, setLoadingOrgAdmins] = useState(false);
  const [actingOrgAdminId, setActingOrgAdminId] = useState<string | null>(null);
  const [uploadedImageDataUrl, setUploadedImageDataUrl] = useState<string>('');
  const [analyticsOverview, setAnalyticsOverview] = useState<AnalyticsOverview | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Form state for new event
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    location: '',
    dateTime: '',
    capacity: '',
    imageUrl: '',
    tags: '',
    audience: 'all' as const,
    isRecurring: false,
    recurrenceFrequency: 'weekly' as 'weekly' | 'monthly',
    recurrenceInterval: '1',
    recurrenceCount: '1',
  });

  const [events, setEvents] = useState<any[]>([]);
  const [timeConflictEvent, setTimeConflictEvent] = useState<any | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setCheckingMembership(false);
      return;
    }
    checkMembership();
  }, [isAuthenticated]);

  const checkMembership = async () => {
    try {
      setCheckingMembership(true);
      const [profileRes, membershipData] = await Promise.all([
        authAPI.getProfile().catch(() => ({ isMainAdmin: false })),
        organizationsAPI.getUserMemberships(),
      ]);
      setIsMainAdmin(!!(profileRes as any).isMainAdmin);
      setIsOrgMember(membershipData.isMember);
      if (membershipData.isMember && membershipData.organizations.length > 0) {
        const orgs = membershipData.organizations.map((org: any) => ({
          _id: org._id,
          name: org.name,
          slug: org.slug,
          description: org.description,
          logo: org.logo,
        }));
        setOrganizations(orgs);
        setSelectedOrg(orgs[0]);
        fetchEvents(orgs[0]._id);
      }
    } catch (err) {
      console.error('Failed to check membership:', err);
      setIsOrgMember(false);
    } finally {
      setCheckingMembership(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      setLoadingRequests(true);
      const list = await organizationRequestsAPI.getAllPending();
      setPendingRequests(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to fetch pending requests:', err);
      setPendingRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchOrganizationAdmins = async () => {
    try {
      setLoadingOrgAdmins(true);
      const data = await organizationsAPI.getOrganizationAdmins();
      setOrganizationAdmins(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch organization admins:', err);
      setOrganizationAdmins([]);
    } finally {
      setLoadingOrgAdmins(false);
    }
  };

  const fetchAnalyticsOverview = async () => {
    try {
      setLoadingAnalytics(true);
      const data = await organizationsAPI.getMainAdminAnalytics();
      setAnalyticsOverview(data);
    } catch (err) {
      console.error('Failed to fetch analytics overview:', err);
      setAnalyticsOverview(null);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && isMainAdmin) {
      fetchPendingRequests();
      fetchOrganizationAdmins();
      fetchAnalyticsOverview();
    }
  }, [isAuthenticated, isMainAdmin]);

  const handleApproveRequest = async (requestId: string) => {
    try {
      setActingRequestId(requestId);
      await organizationRequestsAPI.approve(requestId);
      setPendingRequests((prev) => prev.filter((r) => r._id !== requestId));
      setSuccessMessage('Request approved.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to approve');
    } finally {
      setActingRequestId(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      setActingRequestId(requestId);
      await organizationRequestsAPI.reject(requestId);
      setPendingRequests((prev) => prev.filter((r) => r._id !== requestId));
      setSuccessMessage('Request rejected.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to reject');
    } finally {
      setActingRequestId(null);
    }
  };


  const fetchEvents = async (orgId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/events/by-organization/${orgId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;

    const selectedTime = eventForm.dateTime ? new Date(eventForm.dateTime).getTime() : null;
    const conflictingEvent = selectedTime
      ? events.find((event) => new Date(event.dateTime).getTime() === selectedTime)
      : null;

    if (conflictingEvent) {
      setTimeConflictEvent(conflictingEvent);
      return;
    }

    await submitEvent(false);
  };

  const handleRemoveOrganizationAdmin = async (membershipId: string) => {
    try {
      setActingOrgAdminId(membershipId);
      await organizationsAPI.removeOrganizationAdmin(membershipId);
      setSuccessMessage('Admin access removed.');
      await fetchOrganizationAdmins();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to remove admin');
    } finally {
      setActingOrgAdminId(null);
    }
  };

  const handleEventImageFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setError('Image size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadedImageDataUrl(reader.result);
      }
    };
    reader.onerror = () => setError('Failed to read image file');
    reader.readAsDataURL(file);
  };

  const clearEventImage = () => {
    setUploadedImageDataUrl('');
    setEventForm((prev) => ({ ...prev, imageUrl: '' }));
    const fileInput = document.getElementById('eventImageFile') as HTMLInputElement | null;
    if (fileInput) fileInput.value = '';
  };

  const submitEvent = async (allowTimeConflict: boolean) => {
    if (!selectedOrg) return;

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      const eventImage = uploadedImageDataUrl || eventForm.imageUrl;
      const recurrencePayload = eventForm.isRecurring
        ? {
            frequency: eventForm.recurrenceFrequency,
            interval: Number(eventForm.recurrenceInterval) || 1,
            count: Number(eventForm.recurrenceCount) || 1,
          }
        : undefined;
      const response = await fetch(`${import.meta.env.VITE_API_URL}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: eventForm.title,
          description: eventForm.description,
          location: eventForm.location,
          dateTime: new Date(eventForm.dateTime).toISOString(),
          capacity: eventForm.capacity ? parseInt(eventForm.capacity, 10) : undefined,
          organizationId: selectedOrg._id,
          media: eventImage ? [{ type: 'image', url: eventImage }] : [],
          tags: eventForm.tags.split(',').map(t => t.trim()).filter(t => t),
          audience: eventForm.audience,
          isPublished: true,
          allowTimeConflict,
          recurrence: recurrencePayload,
        }),
      });

      if (response.ok) {
        setSuccessMessage('Event created successfully!');
        setTimeConflictEvent(null);
        setUploadedImageDataUrl('');
        setEventForm({ title: '', description: '', location: '', dateTime: '', capacity: '', imageUrl: '', tags: '', audience: 'all', isRecurring: false, recurrenceFrequency: 'weekly', recurrenceInterval: '1', recurrenceCount: '1' });
        fetchEvents(selectedOrg._id);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 409 && errorData?.code === 'EVENT_TIME_CONFLICT') {
          const selectedTime = eventForm.dateTime ? new Date(eventForm.dateTime).getTime() : null;
          const conflictingEvent = selectedTime
            ? events.find((event) => new Date(event.dateTime).getTime() === selectedTime)
            : null;
          setTimeConflictEvent(conflictingEvent || { title: 'Another event' });
        } else {
          setError(errorData.error || 'Failed to create event');
        }
      }
    } catch (err) {
      setError('An error occurred while creating the event');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background pt-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Admin Access Required</h1>
          <p className="text-muted-foreground mb-6">Please sign in to access the admin dashboard</p>
          <Link to="/feed">
            <Button>Go to Feed</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (checkingMembership) {
    return (
      <div className="min-h-screen bg-background pt-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

  const canAccessAdmin = isMainAdmin || isOrgMember;
  if (!canAccessAdmin) {
    return (
      <div className="min-h-screen bg-background pt-20 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <Link to="/feed" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-4">
              <ArrowLeft className="w-4 h-4" />
              Back to Feed
            </Link>
            <h1 className="text-4xl font-bold tracking-tight">Organization Access Required</h1>
            <p className="text-muted-foreground mt-2">You need to be a member of an organization to access the admin dashboard</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Request Organization Access
              </CardTitle>
              <CardDescription>
                Request access to an organization to create and manage events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  You are currently not a member of any organization. Request access to an organization to get started with creating events.
                </AlertDescription>
              </Alert>
              <Button onClick={() => setShowRequestModal(true)} className="w-full" size="lg">
                <UserPlus className="w-4 h-4 mr-2" />
                Request Organization Access
              </Button>
            </CardContent>
          </Card>

          {/* Request Organization Modal */}
          {showRequestModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4">
                <h2 className="text-lg font-semibold mb-4">Request Organization Access</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Select an organization to request access. Admins will review your request and respond within 24 hours.
                </p>
                <OrganizationRequestForm onClose={() => setShowRequestModal(false)} onSuccess={checkMembership} />
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 px-4 pb-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to="/feed" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Feed
          </Link>
          <h1 className="text-4xl font-bold tracking-tight">
            {isMainAdmin ? 'Admin Dashboard' : 'Organization Admin'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isMainAdmin ? 'Review access requests and manage events' : 'Manage your organization and create events'}
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert className="mb-6 bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800">
            <AlertDescription className="text-green-800 dark:text-green-200">{successMessage}</AlertDescription>
          </Alert>
        )}

        {/* Main admin only: Pending access requests */}
        {isMainAdmin && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Pending Access Requests
              </CardTitle>
              <CardDescription>
                Approve or reject organization access requests. You will be notified when new requests arrive.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRequests ? (
                <p className="text-muted-foreground text-sm">Loading requests...</p>
              ) : pendingRequests.length === 0 ? (
                <p className="text-muted-foreground text-sm">No pending requests</p>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((req) => (
                    <div
                      key={req._id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">
                          {(req.userId as any)?.displayName || (req.userId as any)?.email || 'Unknown'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {(req.userId as any)?.email} → {(req.organizationId as any)?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(req.requestedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleApproveRequest(req._id)}
                          disabled={!!actingRequestId}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRejectRequest(req._id)}
                          disabled={!!actingRequestId}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isMainAdmin && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Analytics Overview</CardTitle>
              <CardDescription>
                Platform-level trends: reach, saves, RSVP, and attendance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAnalytics ? (
                <p className="text-muted-foreground text-sm">Loading analytics...</p>
              ) : !analyticsOverview?.summary ? (
                <p className="text-muted-foreground text-sm">No analytics available</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Total Events</p>
                    <p className="text-xl font-semibold">{analyticsOverview.summary.totalEvents}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Calendar Saves</p>
                    <p className="text-xl font-semibold">{analyticsOverview.summary.totalSaves}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">RSVPs</p>
                    <p className="text-xl font-semibold">{analyticsOverview.summary.totalRsvps}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Check-ins</p>
                    <p className="text-xl font-semibold">{analyticsOverview.summary.totalCheckIns}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isMainAdmin && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Organization Admins
              </CardTitle>
              <CardDescription>
                View who is admin in each organization and remove admin access when needed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingOrgAdmins ? (
                <p className="text-muted-foreground text-sm">Loading organization admins...</p>
              ) : organizationAdmins.length === 0 ? (
                <p className="text-muted-foreground text-sm">No organizations found</p>
              ) : (
                <div className="space-y-4">
                  {organizationAdmins.map((org) => (
                    <div key={org.organizationId} className="rounded-lg border p-3">
                      <div className="mb-3">
                        <p className="font-medium">{org.organizationName}</p>
                        <p className="text-xs text-muted-foreground">{org.organizationSlug}</p>
                      </div>
                      {org.admins.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No admins assigned</p>
                      ) : (
                        <div className="space-y-2">
                          {org.admins.map((admin) => (
                            <div key={admin.membershipId} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2">
                              <div>
                                <p className="text-sm font-medium">{admin.name}</p>
                                <p className="text-xs text-muted-foreground">{admin.email || 'No email'} • {admin.role}</p>
                              </div>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRemoveOrganizationAdmin(admin.membershipId)}
                                disabled={actingOrgAdminId === admin.membershipId || admin.role === 'owner'}
                              >
                                {admin.role === 'owner' ? 'Owner' : 'Remove Admin'}
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!isOrgMember && (
          <Alert className="mb-6">
            <AlertDescription>
              {isMainAdmin ? 'As main admin you can approve access requests above. To create events, request access to an organization from the feed menu.' : 'Request organization access above to create events.'}
            </AlertDescription>
          </Alert>
        )}

        {isOrgMember && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Organizations */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Organizations</CardTitle>
                <CardDescription>Your organizations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {organizations.map((org) => (
                  <button
                    key={org._id}
                    onClick={() => {
                      setSelectedOrg(org);
                      setTimeConflictEvent(null);
                      fetchEvents(org._id);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedOrg?._id === org._id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="font-medium text-sm">{org.name}</div>
                    <div className="text-xs opacity-70">{org.slug}</div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Create Event Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Create New Event
                </CardTitle>
                <CardDescription>Add a new event to your organization's feed</CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedOrg ? (
                  <Alert>
                    <AlertDescription>Please select an organization to create events</AlertDescription>
                  </Alert>
                ) : (
                  <form onSubmit={handleCreateEvent} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Event Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Campus Tech Meetup"
                      value={eventForm.title}
                      onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your event..."
                      value={eventForm.description}
                      onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                      required
                      className="min-h-32"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="eventImageFile">Event Image</Label>
                    <Input
                      id="eventImageFile"
                      type="file"
                      accept="image/*"
                      onChange={handleEventImageFileChange}
                    />
                    <p className="text-xs text-muted-foreground">You can upload from device or paste an image URL below.</p>
                    <Input
                      id="imageUrl"
                      placeholder="https://example.com/image.jpg"
                      value={eventForm.imageUrl}
                      onChange={(e) => {
                        setEventForm({ ...eventForm, imageUrl: e.target.value });
                        if (e.target.value) setUploadedImageDataUrl('');
                      }}
                    />
                    {(uploadedImageDataUrl || eventForm.imageUrl) && (
                      <div className="mt-2 relative inline-block">
                        <img src={uploadedImageDataUrl || eventForm.imageUrl} alt="Event preview" className="h-20 w-20 object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={clearEventImage}
                          className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 hover:bg-destructive/90"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      placeholder="e.g., tech, conference, networking"
                      value={eventForm.tags}
                      onChange={(e) => setEventForm({ ...eventForm, tags: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        placeholder="e.g., Building A, Room 101"
                        value={eventForm.location}
                        onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="capacity">Capacity</Label>
                      <Input
                        id="capacity"
                        type="number"
                        placeholder="e.g., 100"
                        value={eventForm.capacity}
                        onChange={(e) => setEventForm({ ...eventForm, capacity: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="audience">Target Audience</Label>
                    <select
                      id="audience"
                      value={eventForm.audience}
                      onChange={(e) => setEventForm({ ...eventForm, audience: e.target.value as any })}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    >
                      <option value="all">Everyone</option>
                      <option value="ug">Undergraduates</option>
                      <option value="pg">Postgraduates</option>
                      <option value="phd">PhD Students</option>
                      <option value="faculty">Faculty</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="dateTime">Date & Time</Label>
                    <Input
                      id="dateTime"
                      type="datetime-local"
                      value={eventForm.dateTime}
                      onChange={(e) => {
                        setEventForm({ ...eventForm, dateTime: e.target.value });
                        setTimeConflictEvent(null);
                      }}
                      required
                    />
                  </div>

                  <div className="rounded-md border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="isRecurring">Recurring Event</Label>
                      <input
                        id="isRecurring"
                        type="checkbox"
                        checked={eventForm.isRecurring}
                        onChange={(e) => setEventForm({ ...eventForm, isRecurring: e.target.checked })}
                      />
                    </div>
                    {eventForm.isRecurring && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <Label htmlFor="recurrenceFrequency">Frequency</Label>
                          <select
                            id="recurrenceFrequency"
                            value={eventForm.recurrenceFrequency}
                            onChange={(e) => setEventForm({ ...eventForm, recurrenceFrequency: e.target.value as 'weekly' | 'monthly' })}
                            className="w-full px-3 py-2 border border-input rounded-md bg-background"
                          >
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="recurrenceInterval">Every</Label>
                          <Input
                            id="recurrenceInterval"
                            type="number"
                            min={1}
                            value={eventForm.recurrenceInterval}
                            onChange={(e) => setEventForm({ ...eventForm, recurrenceInterval: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="recurrenceCount">Occurrences</Label>
                          <Input
                            id="recurrenceCount"
                            type="number"
                            min={1}
                            max={52}
                            value={eventForm.recurrenceCount}
                            onChange={(e) => setEventForm({ ...eventForm, recurrenceCount: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {timeConflictEvent && (
                    <Alert className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                      <AlertDescription>
                        <div className="space-y-3">
                          <p>
                            An event already exists at this same date and time
                            {timeConflictEvent?.title ? ` ("${timeConflictEvent.title}")` : ''}.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              onClick={() => submitEvent(true)}
                              disabled={loading}
                            >
                              Keep Same Timing
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setTimeConflictEvent(null);
                                const input = document.getElementById('dateTime') as HTMLInputElement | null;
                                input?.focus();
                              }}
                              disabled={loading}
                            >
                              Change Time
                            </Button>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? 'Creating...' : 'Create Event'}
                  </Button>
                </form>
                )}
              </CardContent>
            </Card>

            {/* Events List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Recent Events
                </CardTitle>
                <CardDescription>Events created by your organization</CardDescription>
              </CardHeader>
              <CardContent>
                {events.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No events created yet</p>
                ) : (
                  <div className="space-y-4">
                    {events.map((event) => (
                      <div key={event._id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <h3 className="font-semibold">{event.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(event.dateTime).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {event.capacity} capacity
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

// Organization Request Form Component
function OrganizationRequestForm({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const orgs = await organizationsAPI.list();
        setOrganizations(orgs);
      } catch (err) {
        console.error('Failed to fetch organizations:', err);
        setError('Failed to load organizations');
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
      setError(null);
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
        onSuccess?.();
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to send request');
      }
    } catch (err) {
      console.error('Error sending request:', err);
      setError('Failed to send request');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && organizations.length === 0) {
    return <p className="text-sm text-muted-foreground">Loading organizations...</p>;
  }

  const options = buildOrganizationOptions(organizations);

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <select
        value={selectedOrgId}
        onChange={(e) => setSelectedOrgId(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm"
        disabled={isLoading}
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
        {isLoading ? 'Sending...' : 'Send Request'}
      </Button>
    </div>
  );
}
