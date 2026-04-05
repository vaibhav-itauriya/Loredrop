import { useState, useEffect, useMemo, type ChangeEvent } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Plus, ArrowLeft, Calendar, Users, X, UserPlus, AlertCircle, Check, XCircle, Shield, BarChart3, KanbanSquare, MessageSquare } from 'lucide-react';
import { eventsAPI, organizationsAPI, authAPI, organizationRequestsAPI, organizerAPI } from '@/lib/api';
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

interface OrganizerTask {
  _id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  category: string;
  budgetAmount?: number;
  inventoryItems?: string[];
  dueDate?: string;
}

interface OrganizerAnalytics {
  summary?: {
    totalEvents: number;
    totalRsvps: number;
    totalCheckedIn: number;
    conversionRate: number;
    averageRating: number;
    feedbackResponses: number;
    totalBudget: number;
    inventoryTracked: number;
  };
  audienceBreakdown?: Record<string, number>;
  taskBoard?: {
    todo: number;
    inProgress: number;
    done: number;
  };
  eventSummaries?: Array<{
    eventId: string;
    title: string;
    conversionRate: number;
    averageRating: number;
    rsvps: number;
    checkedIn: number;
  }>;
}

interface OrganizerChannel {
  _id: string;
  name: string;
  type: 'organization' | 'event';
}

interface OrganizerMessage {
  _id: string;
  message: string;
  createdAt: string;
  userId?: {
    displayName?: string;
    email?: string;
    isAlumni?: boolean;
  };
}

export default function AdminPage() {
  const { isAuthenticated } = useAuth();
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
  const [assigningOrgAdmin, setAssigningOrgAdmin] = useState(false);
  const [uploadedImageDataUrl, setUploadedImageDataUrl] = useState<string>('');
  const [analyticsOverview, setAnalyticsOverview] = useState<AnalyticsOverview | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [newOrgAdminForm, setNewOrgAdminForm] = useState({
    email: '',
    organizationId: '',
  });

  // Form state for new event
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    location: '',
    dateTime: '',
    endDateTime: '',
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
  const [organizerTasks, setOrganizerTasks] = useState<OrganizerTask[]>([]);
  const [organizerAnalytics, setOrganizerAnalytics] = useState<OrganizerAnalytics | null>(null);
  const [loadingOrganizerData, setLoadingOrganizerData] = useState(false);
  const [channels, setChannels] = useState<OrganizerChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [messages, setMessages] = useState<OrganizerMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    category: 'planning',
    budgetAmount: '',
    inventoryItems: '',
    dueDate: '',
  });
  const [messageDraft, setMessageDraft] = useState('');
  const [channelForm, setChannelForm] = useState({
    name: '',
    type: 'organization' as 'organization' | 'event',
    eventId: '',
  });

  const liveConflicts = useMemo(() => {
    if (!eventForm.dateTime || !events.length) return [];

    const start = new Date(eventForm.dateTime);
    if (Number.isNaN(start.getTime())) return [];

    const end = eventForm.endDateTime
      ? new Date(eventForm.endDateTime)
      : new Date(start.getTime() + 60 * 60 * 1000);
    if (Number.isNaN(end.getTime()) || end <= start) return [];

    return events.filter((event) => {
      const eventStart = new Date(event.dateTime);
      const eventEnd = event.endDateTime
        ? new Date(event.endDateTime)
        : new Date(eventStart.getTime() + 60 * 60 * 1000);
      return eventStart < end && eventEnd > start;
    });
  }, [eventForm.dateTime, eventForm.endDateTime, events]);

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
        fetchOrganizerWorkspace(orgs[0]._id);
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

  useEffect(() => {
    if (selectedChannelId) {
      fetchChannelMessages(selectedChannelId);
    } else {
      setMessages([]);
    }
  }, [selectedChannelId]);

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

    const conflictingEvent = liveConflicts[0] || null;

    if (conflictingEvent) {
      setTimeConflictEvent(conflictingEvent);
      return;
    }

    await submitEvent(false);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg || !taskForm.title.trim()) return;

    try {
      await organizerAPI.createTask(selectedOrg._id, {
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        category: taskForm.category,
        budgetAmount: taskForm.budgetAmount ? Number(taskForm.budgetAmount) : undefined,
        inventoryItems: taskForm.inventoryItems.split(',').map((item) => item.trim()).filter(Boolean),
        dueDate: taskForm.dueDate || undefined,
      });
      setTaskForm({
        title: '',
        description: '',
        category: 'planning',
        budgetAmount: '',
        inventoryItems: '',
        dueDate: '',
      });
      fetchOrganizerWorkspace(selectedOrg._id);
      setSuccessMessage('Organizer task created.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to create organizer task');
    }
  };

  const handleAdvanceTask = async (task: OrganizerTask) => {
    const nextStatus =
      task.status === 'todo' ? 'in_progress' : task.status === 'in_progress' ? 'done' : 'todo';
    try {
      await organizerAPI.updateTask(task._id, { status: nextStatus });
      if (selectedOrg) {
        fetchOrganizerWorkspace(selectedOrg._id);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update task');
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg || !channelForm.name.trim()) return;
    try {
      await organizerAPI.createChannel(selectedOrg._id, {
        name: channelForm.name.trim(),
        type: channelForm.type,
        eventId: channelForm.type === 'event' ? channelForm.eventId || undefined : undefined,
      });
      setChannelForm({ name: '', type: 'organization', eventId: '' });
      await fetchOrganizerWorkspace(selectedOrg._id);
      setSuccessMessage('Channel created successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to create channel');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannelId || !messageDraft.trim()) return;
    try {
      await organizerAPI.postMessage(selectedChannelId, messageDraft.trim());
      setMessageDraft('');
      fetchChannelMessages(selectedChannelId);
    } catch (err: any) {
      setError(err?.message || 'Failed to send message');
    }
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

  const fetchOrganizerWorkspace = async (orgId: string) => {
    try {
      setLoadingOrganizerData(true);
      const [tasks, analytics, orgChannels] = await Promise.all([
        organizerAPI.getTasks(orgId).catch(() => []),
        organizerAPI.getAnalytics(orgId).catch(() => null),
        organizerAPI.getChannels(orgId).catch(() => []),
      ]);
      setOrganizerTasks(Array.isArray(tasks) ? tasks : []);
      setOrganizerAnalytics(analytics);
      const nextChannels = Array.isArray(orgChannels) ? orgChannels : [];
      setChannels(nextChannels);
      if (nextChannels.length === 0) {
        setSelectedChannelId('');
      } else if (!nextChannels.some((channel) => channel._id === selectedChannelId)) {
        setSelectedChannelId(nextChannels[0]._id);
      }
    } catch (err) {
      console.error('Failed to load organizer workspace:', err);
    } finally {
      setLoadingOrganizerData(false);
    }
  };

  const fetchChannelMessages = async (channelId: string) => {
    try {
      setLoadingMessages(true);
      const data = await organizerAPI.getMessages(channelId);
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch channel messages:', err);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleAssignOrganizationAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAssigningOrgAdmin(true);
      setError(null);
      await organizationsAPI.assignOrganizationAdmin({
        email: newOrgAdminForm.email.trim().toLowerCase(),
        organizationId: newOrgAdminForm.organizationId,
      });
      setSuccessMessage('Organization admin assigned successfully.');
      setNewOrgAdminForm({ email: '', organizationId: '' });
      await fetchOrganizationAdmins();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to assign organization admin');
    } finally {
      setAssigningOrgAdmin(false);
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
          endDateTime: eventForm.endDateTime ? new Date(eventForm.endDateTime).toISOString() : undefined,
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
        setEventForm({ title: '', description: '', location: '', dateTime: '', endDateTime: '', capacity: '', imageUrl: '', tags: '', audience: 'all', isRecurring: false, recurrenceFrequency: 'weekly', recurrenceInterval: '1', recurrenceCount: '1' });
        fetchEvents(selectedOrg._id);
        fetchOrganizerWorkspace(selectedOrg._id);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 409 && errorData?.code === 'EVENT_TIME_CONFLICT') {
          setTimeConflictEvent(liveConflicts[0] || errorData?.conflictingDates?.[0] || { title: 'Another event' });
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
                View who is admin in each organization, add new admins directly, and remove admin access when needed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAssignOrganizationAdmin} className="grid gap-3 rounded-lg border p-4 mb-4 md:grid-cols-[1.3fr_1fr_auto]">
                <Input
                  type="email"
                  placeholder="student@iitk.ac.in"
                  value={newOrgAdminForm.email}
                  onChange={(e) => setNewOrgAdminForm((prev) => ({ ...prev, email: e.target.value }))}
                  disabled={assigningOrgAdmin}
                />
                <select
                  value={newOrgAdminForm.organizationId}
                  onChange={(e) => setNewOrgAdminForm((prev) => ({ ...prev, organizationId: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={assigningOrgAdmin}
                >
                  <option value="">Select organization</option>
                  {organizationAdmins.map((org) => (
                    <option key={org.organizationId} value={org.organizationId}>
                      {org.organizationName}
                    </option>
                  ))}
                </select>
                <Button
                  type="submit"
                  disabled={assigningOrgAdmin || !newOrgAdminForm.email.trim() || !newOrgAdminForm.organizationId}
                >
                  {assigningOrgAdmin ? 'Assigning...' : 'Add Org Admin'}
                </Button>
              </form>

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
                      fetchOrganizerWorkspace(org._id);
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

                  <div>
                    <Label htmlFor="endDateTime">End Time</Label>
                    <Input
                      id="endDateTime"
                      type="datetime-local"
                      value={eventForm.endDateTime}
                      onChange={(e) => {
                        setEventForm({ ...eventForm, endDateTime: e.target.value });
                        setTimeConflictEvent(null);
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Optional. If left empty, a 1 hour duration is used for clash checking.
                    </p>
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

                  {liveConflicts.length > 0 && (
                    <Alert className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                      <AlertDescription>
                        <div className="space-y-2">
                          <p className="font-medium">Possible clashes for this time slot</p>
                          <div className="space-y-2">
                            {liveConflicts.slice(0, 3).map((conflict) => (
                              <div key={conflict._id} className="rounded-md border border-amber-200/60 bg-background/70 p-2 text-sm dark:border-amber-900">
                                <p className="font-medium">{conflict.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(conflict.dateTime).toLocaleString()}
                                  {conflict.endDateTime ? ` to ${new Date(conflict.endDateTime).toLocaleString()}` : ''}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {timeConflictEvent && (
                    <Alert className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                      <AlertDescription>
                        <div className="space-y-3">
                          <p>
                            An event already overlaps with this time slot
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

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <KanbanSquare className="w-5 h-5" />
                    Organizer Task Board
                  </CardTitle>
                  <CardDescription>Track planning, budgets, and inventory before events go live</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleCreateTask} className="space-y-3">
                    <Input
                      placeholder="Task title"
                      value={taskForm.title}
                      onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    />
                    <Textarea
                      placeholder="Task notes, owner context, or budget rationale"
                      value={taskForm.description}
                      onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <select
                        value={taskForm.category}
                        onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background"
                      >
                        <option value="planning">Planning</option>
                        <option value="budget">Budget</option>
                        <option value="inventory">Inventory</option>
                        <option value="marketing">Marketing</option>
                        <option value="logistics">Logistics</option>
                        <option value="other">Other</option>
                      </select>
                      <Input
                        type="number"
                        placeholder="Budget"
                        value={taskForm.budgetAmount}
                        onChange={(e) => setTaskForm({ ...taskForm, budgetAmount: e.target.value })}
                      />
                      <Input
                        type="datetime-local"
                        value={taskForm.dueDate}
                        onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                      />
                    </div>
                    <Input
                      placeholder="Inventory items (comma-separated)"
                      value={taskForm.inventoryItems}
                      onChange={(e) => setTaskForm({ ...taskForm, inventoryItems: e.target.value })}
                    />
                    <Button type="submit" className="w-full">Add Organizer Task</Button>
                  </form>

                  {loadingOrganizerData ? (
                    <p className="text-sm text-muted-foreground">Loading task board...</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {(['todo', 'in_progress', 'done'] as const).map((status) => (
                        <div key={status} className="rounded-lg border p-3 space-y-3">
                          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            {status.replace('_', ' ')}
                          </p>
                          {organizerTasks.filter((task) => task.status === status).length === 0 ? (
                            <p className="text-xs text-muted-foreground">No tasks here yet.</p>
                          ) : (
                            organizerTasks
                              .filter((task) => task.status === status)
                              .map((task) => (
                                <button
                                  key={task._id}
                                  type="button"
                                  onClick={() => handleAdvanceTask(task)}
                                  className="w-full rounded-lg border bg-muted/40 p-3 text-left hover:bg-muted"
                                >
                                  <p className="font-medium">{task.title}</p>
                                  <p className="text-xs text-muted-foreground mt-1">{task.category}</p>
                                  {task.budgetAmount ? (
                                    <p className="text-xs text-muted-foreground mt-1">Budget: Rs. {task.budgetAmount}</p>
                                  ) : null}
                                  {task.inventoryItems?.length ? (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Inventory: {task.inventoryItems.join(', ')}
                                    </p>
                                  ) : null}
                                </button>
                              ))
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Organizer Analytics
                  </CardTitle>
                  <CardDescription>Conversion, audience mix, and post-event quality signals</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!organizerAnalytics?.summary ? (
                    <p className="text-sm text-muted-foreground">Analytics will appear once your workspace data loads.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">RSVP to Check-in</p>
                          <p className="text-2xl font-semibold">{organizerAnalytics.summary.conversionRate}%</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">Average Feedback</p>
                          <p className="text-2xl font-semibold">{organizerAnalytics.summary.averageRating || 0}/5</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">Tracked Budget</p>
                          <p className="text-2xl font-semibold">Rs. {organizerAnalytics.summary.totalBudget || 0}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">Feedback Responses</p>
                          <p className="text-2xl font-semibold">{organizerAnalytics.summary.feedbackResponses || 0}</p>
                        </div>
                      </div>

                      <div className="rounded-lg border p-4">
                        <p className="text-sm font-medium mb-2">Audience Breakdown</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(organizerAnalytics.audienceBreakdown || {}).map(([key, value]) => (
                            <span key={key} className="rounded-full bg-muted px-3 py-1 text-xs">
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium">Best-performing events</p>
                        {(organizerAnalytics.eventSummaries || []).slice(0, 4).map((event) => (
                          <div key={event.eventId} className="rounded-lg border p-3">
                            <p className="font-medium">{event.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {event.checkedIn}/{event.rsvps} checked in • {event.conversionRate}% conversion • {event.averageRating || 0}/5 rating
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Organizer Messaging
                </CardTitle>
                <CardDescription>Lightweight team channels for organization or event coordination</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-6">
                <div className="space-y-4">
                  <form onSubmit={handleCreateChannel} className="space-y-3 rounded-lg border p-4">
                    <Input
                      placeholder="New channel name"
                      value={channelForm.name}
                      onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })}
                    />
                    <select
                      value={channelForm.type}
                      onChange={(e) => setChannelForm({ ...channelForm, type: e.target.value as 'organization' | 'event' })}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    >
                      <option value="organization">Organization Channel</option>
                      <option value="event">Event Channel</option>
                    </select>
                    {channelForm.type === 'event' && (
                      <select
                        value={channelForm.eventId}
                        onChange={(e) => setChannelForm({ ...channelForm, eventId: e.target.value })}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background"
                      >
                        <option value="">Select event</option>
                        {events.map((event) => (
                          <option key={event._id} value={event._id}>{event.title}</option>
                        ))}
                      </select>
                    )}
                    <Button type="submit" className="w-full">Create Channel</Button>
                  </form>

                  <div className="space-y-2">
                    {channels.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No channels yet.</p>
                    ) : (
                      channels.map((channel) => (
                        <button
                          key={channel._id}
                          type="button"
                          onClick={() => setSelectedChannelId(channel._id)}
                          className={`w-full rounded-lg border px-3 py-2 text-left ${
                            selectedChannelId === channel._id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                          }`}
                        >
                          <p className="font-medium">{channel.name}</p>
                          <p className="text-xs opacity-80">{channel.type}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-lg border p-4 space-y-4">
                  {!selectedChannelId ? (
                    <p className="text-sm text-muted-foreground">Select a channel to start chatting.</p>
                  ) : (
                    <>
                      <div className="max-h-80 overflow-y-auto space-y-3">
                        {loadingMessages ? (
                          <p className="text-sm text-muted-foreground">Loading messages...</p>
                        ) : messages.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No messages yet. Start the conversation.</p>
                        ) : (
                          messages.map((message) => (
                            <div key={message._id} className="rounded-lg bg-muted/40 p-3">
                              <p className="text-sm font-medium">
                                {message.userId?.displayName || message.userId?.email || 'Member'}
                                {message.userId?.isAlumni ? ' • Alumni' : ''}
                              </p>
                              <p className="text-sm mt-1">{message.message}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {new Date(message.createdAt).toLocaleString()}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                      <form onSubmit={handleSendMessage} className="flex gap-2">
                        <Input
                          placeholder="Send a message to this channel"
                          value={messageDraft}
                          onChange={(e) => setMessageDraft(e.target.value)}
                        />
                        <Button type="submit">Send</Button>
                      </form>
                    </>
                  )}
                </div>
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
