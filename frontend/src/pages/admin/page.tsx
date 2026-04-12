import { useState, useEffect, useMemo, useRef, type ChangeEvent } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { Label } from '@/components/ui/label.tsx';
import {
  Plus,
  ArrowLeft,
  Calendar,
  Users,
  X,
  UserPlus,
  AlertCircle,
  Check,
  XCircle,
  Shield,
  BarChart3,
  KanbanSquare,
  MessageSquare,
  Clock3,
  SendHorizontal,
  Search,
  RefreshCcw,
  Trash2,
} from 'lucide-react';
import { eventsAPI, organizationsAPI, authAPI, organizationRequestsAPI, organizerAPI } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { buildOrganizationOptions } from '@/lib/org-hierarchy.ts';

interface Organization {
  _id: string;
  name: string;
  slug: string;
  description: string;
  logo?: string;
  role?: 'owner' | 'admin' | 'moderator' | 'member';
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
  assignedToUserId?: string | { _id: string; displayName?: string; email?: string };
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
  eventId?: string;
  updatedAt?: string;
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

interface OrganizerMember {
  _id: string;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  joinedAt: string;
  user: {
    _id: string;
    displayName?: string;
    email?: string;
    avatar?: string;
  } | null;
}

const EVENT_AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Everyone' },
  { value: 'ug', label: 'UG' },
  { value: 'pg', label: 'PG' },
  { value: 'phd', label: 'PhD' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'staff', label: 'Staff' },
] as const;

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
  const [uploadedImageDataUrls, setUploadedImageDataUrls] = useState<string[]>([]);
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
    mode: 'offline' as 'online' | 'offline' | 'hybrid',
    registrationLink: '',
    dateTime: '',
    endDateTime: '',
    capacity: '',
    imageUrl: '',
    tags: '',
    audience: ['all'] as Array<'all' | 'ug' | 'pg' | 'phd' | 'faculty' | 'staff'>,
    isRecurring: false,
    recurrenceFrequency: 'weekly' as 'weekly' | 'monthly',
    recurrenceInterval: '1',
    recurrenceCount: '1',
  });

  const [events, setEvents] = useState<any[]>([]);
  const [timeConflictEvent, setTimeConflictEvent] = useState<any | null>(null);
  const [organizerTasks, setOrganizerTasks] = useState<OrganizerTask[]>([]);
  const [organizerAnalytics, setOrganizerAnalytics] = useState<OrganizerAnalytics | null>(null);
  const [organizerMembers, setOrganizerMembers] = useState<OrganizerMember[]>([]);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [loadingOrganizerData, setLoadingOrganizerData] = useState(false);
  const [channels, setChannels] = useState<OrganizerChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [messages, setMessages] = useState<OrganizerMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [taskSearch, setTaskSearch] = useState('');
  const [taskCategoryFilter, setTaskCategoryFilter] = useState('all');
  const [channelSearch, setChannelSearch] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [refreshingWorkspace, setRefreshingWorkspace] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    category: 'planning',
    assignedToUserId: '',
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
  const messageBottomRef = useRef<HTMLDivElement | null>(null);
  const minEventDateTime = useMemo(() => {
    const now = new Date();
    now.setSeconds(0, 0);
    const offset = now.getTimezoneOffset();
    return new Date(now.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
  }, []);

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

  const eventTimeError = useMemo(() => {
    if (!eventForm.dateTime) return '';

    const start = new Date(eventForm.dateTime);
    if (Number.isNaN(start.getTime())) {
      return 'Enter a valid start time.';
    }
    const now = new Date();
    now.setSeconds(0, 0);
    if (start < now) {
      return 'Start time cannot be in the past.';
    }
    if (!eventForm.endDateTime) return '';

    const end = new Date(eventForm.endDateTime);
    if (Number.isNaN(end.getTime())) {
      return 'Enter a valid end time.';
    }
    if (end <= start) {
      return 'End time must be after start time.';
    }
    return '';
  }, [eventForm.dateTime, eventForm.endDateTime]);

  const filteredTasks = useMemo(() => {
    const normalizedQuery = taskSearch.trim().toLowerCase();
    return organizerTasks.filter((task) => {
      const matchesQuery =
        !normalizedQuery ||
        task.title.toLowerCase().includes(normalizedQuery) ||
        (task.description || '').toLowerCase().includes(normalizedQuery);
      const matchesCategory = taskCategoryFilter === 'all' || task.category === taskCategoryFilter;
      return matchesQuery && matchesCategory;
    });
  }, [organizerTasks, taskCategoryFilter, taskSearch]);

  const filteredChannels = useMemo(() => {
    const normalizedQuery = channelSearch.trim().toLowerCase();
    if (!normalizedQuery) return channels;
    return channels.filter((channel) => channel.name.toLowerCase().includes(normalizedQuery));
  }, [channelSearch, channels]);

  const selectedChannel = useMemo(
    () => channels.find((channel) => channel._id === selectedChannelId) || null,
    [channels, selectedChannelId],
  );

  const canViewOrganizerAnalytics = selectedOrg?.role === 'owner' || selectedOrg?.role === 'admin' || selectedOrg?.role === 'moderator';

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
      setCurrentUserEmail((profileRes as any)?.email || '');
      setIsOrgMember(membershipData.isMember);
      if (membershipData.isMember && membershipData.organizations.length > 0) {
        const orgs = membershipData.organizations.map((org: any) => ({
          _id: org._id,
          name: org.name,
          slug: org.slug,
          description: org.description,
          logo: org.logo,
          role: org.role,
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
    setMessageDraft('');
  }, [selectedChannelId]);

  useEffect(() => {
    if (!selectedChannelId) return;
    const timer = setInterval(() => {
      fetchChannelMessages(selectedChannelId);
    }, 8000);
    return () => clearInterval(timer);
  }, [selectedChannelId]);

  useEffect(() => {
    if (!selectedOrg?._id) return;
    const timer = setInterval(() => {
      fetchOrganizerWorkspace(selectedOrg._id);
    }, 30000);
    return () => clearInterval(timer);
  }, [selectedOrg?._id, selectedChannelId]);

  useEffect(() => {
    if (messageBottomRef.current) {
      messageBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

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
      const data = await eventsAPI.getByOrganization(orgId);
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setEvents([]);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;
    if (eventTimeError) {
      setError(eventTimeError);
      return;
    }

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
      setError(null);
      await organizerAPI.createTask(selectedOrg._id, {
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        category: taskForm.category,
        assignedToUserId: taskForm.assignedToUserId || undefined,
        budgetAmount: taskForm.budgetAmount ? Number(taskForm.budgetAmount) : undefined,
        inventoryItems: taskForm.inventoryItems.split(',').map((item) => item.trim()).filter(Boolean),
        dueDate: taskForm.dueDate || undefined,
      });
      setTaskForm({
        title: '',
        description: '',
        category: 'planning',
        assignedToUserId: '',
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

  const handleDeleteTask = async (taskId: string) => {
    if (!selectedOrg) return;
    try {
      await organizerAPI.deleteTask(taskId);
      setOrganizerTasks((prev) => prev.filter((task) => task._id !== taskId));
      setSuccessMessage('Task removed.');
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete task');
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg || !channelForm.name.trim()) return;
    setError(null);
    if (channelForm.type === 'event' && !channelForm.eventId) {
      setError('Select an event to create an event channel.');
      return;
    }
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
      setError(null);
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
      setRefreshingWorkspace(true);
      setAnalyticsError(null);
      const [tasksResult, analyticsResult, channelsResult, membersResult] = await Promise.allSettled([
        organizerAPI.getTasks(orgId),
        organizerAPI.getAnalytics(orgId),
        organizerAPI.getChannels(orgId),
        organizerAPI.getOrganizationMembers(orgId),
      ]);

      const tasks = tasksResult.status === 'fulfilled' ? tasksResult.value : [];
      const analytics = analyticsResult.status === 'fulfilled' ? analyticsResult.value : null;
      const orgChannels = channelsResult.status === 'fulfilled' ? channelsResult.value : [];
      const members = membersResult.status === 'fulfilled' ? membersResult.value : [];

      if (analyticsResult.status === 'rejected') {
        const message =
          analyticsResult.reason instanceof Error
            ? analyticsResult.reason.message
            : 'Analytics are unavailable for your current role.';
        setAnalyticsError(message);
      }

      setOrganizerTasks(Array.isArray(tasks) ? tasks : []);
      setOrganizerAnalytics(analytics);
      setOrganizerMembers(Array.isArray(members) ? members : []);
      const nextChannels = Array.isArray(orgChannels) ? orgChannels : [];
      setChannels(nextChannels);
      if (nextChannels.length === 0) {
        setSelectedChannelId('');
      } else if (!nextChannels.some((channel) => channel._id === selectedChannelId)) {
        setSelectedChannelId(nextChannels[0]._id);
      }
    } catch (err) {
      console.error('Failed to load organizer workspace:', err);
      setOrganizerTasks([]);
      setOrganizerAnalytics(null);
      setChannels([]);
      setOrganizerMembers([]);
    } finally {
      setLoadingOrganizerData(false);
      setRefreshingWorkspace(false);
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
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const maxBytes = 5 * 1024 * 1024;
    const invalid = files.find((file) => !file.type.startsWith('image/'));
    if (invalid) {
      setError('Please select valid image files');
      return;
    }
    const oversized = files.find((file) => file.size > maxBytes);
    if (oversized) {
      setError('Each image must be less than 5MB');
      return;
    }

    Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result === 'string') resolve(reader.result);
              else reject(new Error('Failed to read image file'));
            };
            reader.onerror = () => reject(new Error('Failed to read image file'));
            reader.readAsDataURL(file);
          }),
      ),
    )
      .then((dataUrls) => {
        setUploadedImageDataUrls((prev) => [...prev, ...dataUrls]);
        setUploadedImageDataUrl((prev) => prev || dataUrls[0] || '');
      })
      .catch(() => setError('Failed to read image file'));
  };

  const removeUploadedImageAt = (index: number) => {
    setUploadedImageDataUrls((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setUploadedImageDataUrl(next[0] || '');
      return next;
    });
  };

  const clearEventImage = () => {
    setUploadedImageDataUrl('');
    setUploadedImageDataUrls([]);
    setEventForm((prev) => ({ ...prev, imageUrl: '' }));
    const fileInput = document.getElementById('eventImageFile') as HTMLInputElement | null;
    if (fileInput) fileInput.value = '';
  };

  const toggleAudience = (audience: 'all' | 'ug' | 'pg' | 'phd' | 'faculty' | 'staff') => {
    setEventForm((prev) => {
      if (audience === 'all') {
        return { ...prev, audience: ['all'] };
      }

      const withoutAll = prev.audience.filter((item) => item !== 'all');
      const next = withoutAll.includes(audience)
        ? withoutAll.filter((item) => item !== audience)
        : [...withoutAll, audience];

      return {
        ...prev,
        audience: next.length > 0 ? next : ['all'],
      };
    });
  };

  const handleTaskStatusChange = async (task: OrganizerTask, status: 'todo' | 'in_progress' | 'done') => {
    try {
      await organizerAPI.updateTask(task._id, { status });
      setOrganizerTasks((prev) => prev.map((item) => (item._id === task._id ? { ...item, status } : item)));
    } catch (err: any) {
      setError(err?.message || 'Failed to update task status');
    }
  };

  const submitEvent = async (allowTimeConflict: boolean) => {
    if (!selectedOrg) return;

    try {
      setLoading(true);
      setError(null);

      const uploadedImages = uploadedImageDataUrls.length > 0
        ? uploadedImageDataUrls
        : uploadedImageDataUrl
          ? [uploadedImageDataUrl]
          : [];
      const urlImage = eventForm.imageUrl.trim();
      const allImageUrls = uploadedImages.length > 0
        ? [...uploadedImages, ...(urlImage ? [urlImage] : [])]
        : urlImage
          ? [urlImage]
          : [];
      const parsedCapacity = eventForm.capacity ? parseInt(eventForm.capacity, 10) : undefined;
      if (new Date(eventForm.dateTime) < new Date()) {
        setError('Start time cannot be in the past.');
        return;
      }
      if (eventForm.endDateTime && new Date(eventForm.endDateTime) <= new Date(eventForm.dateTime)) {
        setError('End time must be after start time.');
        return;
      }
      if (parsedCapacity !== undefined && (Number.isNaN(parsedCapacity) || parsedCapacity <= 0)) {
        setError('Capacity must be a positive number.');
        return;
      }
      if (eventForm.mode === 'online' && !eventForm.registrationLink.trim()) {
        setError('Online events should include a registration or meeting link.');
        return;
      }

      const recurrencePayload = eventForm.isRecurring
        ? {
            frequency: eventForm.recurrenceFrequency,
            interval: Number(eventForm.recurrenceInterval) || 1,
            count: Number(eventForm.recurrenceCount) || 1,
          }
        : undefined;

      await eventsAPI.createEvent({
        title: eventForm.title,
        description: eventForm.description,
        location: eventForm.location,
        mode: eventForm.mode,
        registrationLink: eventForm.registrationLink.trim() || undefined,
        dateTime: new Date(eventForm.dateTime).toISOString(),
        endDateTime: eventForm.endDateTime ? new Date(eventForm.endDateTime).toISOString() : undefined,
        capacity: parsedCapacity,
        organizationId: selectedOrg._id,
        media: allImageUrls.map((url) => ({ type: 'image', url })),
        tags: eventForm.tags.split(',').map(t => t.trim()).filter(t => t),
        audience: eventForm.audience,
        isPublished: true,
        allowTimeConflict,
        recurrence: recurrencePayload,
      });

      setSuccessMessage('Event created successfully!');
      setTimeConflictEvent(null);
      setUploadedImageDataUrl('');
      setUploadedImageDataUrls([]);
      setEventForm({
        title: '',
        description: '',
        location: '',
        mode: 'offline',
        registrationLink: '',
        dateTime: '',
        endDateTime: '',
        capacity: '',
        imageUrl: '',
        tags: '',
        audience: ['all'],
        isRecurring: false,
        recurrenceFrequency: 'weekly',
        recurrenceInterval: '1',
        recurrenceCount: '1',
      });
      fetchEvents(selectedOrg._id);
      fetchOrganizerWorkspace(selectedOrg._id);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      const status = err?.status;
      const errorBody = err?.body;
      if (status === 409 && errorBody?.code === 'EVENT_TIME_CONFLICT') {
        setTimeConflictEvent(liveConflicts[0] || errorBody?.conflictingDates?.[0] || { title: 'Another event' });
      } else {
        setError(err?.message || 'An error occurred while creating the event');
      }
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
            <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8 sm:items-center">
              <div className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-lg bg-background p-6 shadow-xl">
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
                <CardDescription>
                  Structured event builder with timing checks, audience targeting, and media support.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedOrg ? (
                  <Alert>
                    <AlertDescription>Please select an organization to create events</AlertDescription>
                  </Alert>
                ) : (
                  <form onSubmit={handleCreateEvent} className="space-y-4">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      <div className="space-y-4 rounded-lg border p-4">
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

                        <div>
                          <Label htmlFor="tags">Tags (comma-separated)</Label>
                          <Input
                            id="tags"
                            placeholder="e.g., tech, conference, networking"
                            value={eventForm.tags}
                            onChange={(e) => setEventForm({ ...eventForm, tags: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="eventImageFile">Event Images</Label>
                          <Input
                            id="eventImageFile"
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleEventImageFileChange}
                          />
                          <Input
                            id="imageUrl"
                            placeholder="Paste image URL (optional)"
                            value={eventForm.imageUrl}
                            onChange={(e) => {
                              setEventForm({ ...eventForm, imageUrl: e.target.value });
                            }}
                          />
                          {(uploadedImageDataUrls.length > 0 || eventForm.imageUrl) && (
                            <div className="mt-2 flex flex-wrap gap-2 items-start">
                              {uploadedImageDataUrls.map((dataUrl, index) => (
                                <div key={index} className="relative inline-block">
                                  <img src={dataUrl} alt={`Event preview ${index + 1}`} className="h-20 w-20 object-cover rounded-lg" />
                                  <button
                                    type="button"
                                    onClick={() => removeUploadedImageAt(index)}
                                    className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 hover:bg-destructive/90"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                              {eventForm.imageUrl && (
                                <div className="relative inline-block">
                                  <img src={eventForm.imageUrl} alt="Event preview URL" className="h-20 w-20 object-cover rounded-lg" />
                                  <button
                                    type="button"
                                    onClick={() => setEventForm((prev) => ({ ...prev, imageUrl: '' }))}
                                    className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 hover:bg-destructive/90"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                              {(uploadedImageDataUrls.length > 0 || eventForm.imageUrl) && (
                                <button
                                  type="button"
                                  onClick={clearEventImage}
                                  className="h-20 w-20 rounded-lg border border-dashed border-destructive/60 text-xs text-destructive hover:bg-destructive/5"
                                >
                                  Clear all
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4 rounded-lg border p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="location">Location / Venue</Label>
                            <Input
                              id="location"
                              placeholder="e.g., Lecture Hall Complex"
                              value={eventForm.location}
                              onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="mode">Mode</Label>
                            <select
                              id="mode"
                              value={eventForm.mode}
                              onChange={(e) => setEventForm({ ...eventForm, mode: e.target.value as 'online' | 'offline' | 'hybrid' })}
                              className="w-full px-3 py-2 border border-input rounded-md bg-background"
                            >
                              <option value="offline">Offline</option>
                              <option value="online">Online</option>
                              <option value="hybrid">Hybrid</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="registrationLink">Registration / Meeting Link</Label>
                          <Input
                            id="registrationLink"
                            type="url"
                            placeholder="https://..."
                            value={eventForm.registrationLink}
                            onChange={(e) => setEventForm({ ...eventForm, registrationLink: e.target.value })}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="dateTime">Start Time</Label>
                            <Input
                              id="dateTime"
                              type="datetime-local"
                              min={minEventDateTime}
                              value={eventForm.dateTime}
                              onChange={(e) => {
                                setEventForm({ ...eventForm, dateTime: e.target.value });
                                setTimeConflictEvent(null);
                              }}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="endDateTime">End Time (optional)</Label>
                            <Input
                              id="endDateTime"
                              type="datetime-local"
                              min={eventForm.dateTime || undefined}
                              value={eventForm.endDateTime}
                              onChange={(e) => {
                                setEventForm({ ...eventForm, endDateTime: e.target.value });
                                setTimeConflictEvent(null);
                              }}
                            />
                          </div>
                        </div>
                        {eventTimeError ? (
                          <p className="text-sm text-destructive">{eventTimeError}</p>
                        ) : null}

                        <div>
                          <Label htmlFor="capacity">Capacity (optional)</Label>
                          <Input
                            id="capacity"
                            type="number"
                            min={1}
                            placeholder="e.g., 100"
                            value={eventForm.capacity}
                            onChange={(e) => setEventForm({ ...eventForm, capacity: e.target.value })}
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
                      </div>
                    </div>

                    <div className="rounded-md border p-4 space-y-3">
                      <Label>Target Audience</Label>
                      <div className="flex flex-wrap gap-2">
                        {EVENT_AUDIENCE_OPTIONS.map((option) => (
                          <Button
                            key={option.value}
                            type="button"
                            size="sm"
                            variant={eventForm.audience.includes(option.value) ? 'default' : 'outline'}
                            onClick={() => toggleAudience(option.value)}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
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
                          {event.capacity ? (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {event.capacity} capacity
                            </span>
                          ) : null}
                          <span className="capitalize">{event.mode || 'offline'}</span>
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
                  <CardDescription>Assignable planning tasks with filters and status controls.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleCreateTask} className="space-y-3 rounded-lg border p-4">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      <select
                        value={taskForm.assignedToUserId}
                        onChange={(e) => setTaskForm({ ...taskForm, assignedToUserId: e.target.value })}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background"
                      >
                        <option value="">Unassigned</option>
                        {organizerMembers
                          .filter((member) => !!member.user?._id)
                          .map((member) => (
                            <option key={member._id} value={member.user!._id}>
                              {(member.user?.displayName || member.user?.email || 'Member') + ` (${member.role})`}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                      <Input
                        placeholder="Inventory items"
                        value={taskForm.inventoryItems}
                        onChange={(e) => setTaskForm({ ...taskForm, inventoryItems: e.target.value })}
                      />
                    </div>
                    <Button type="submit" className="w-full">Add Organizer Task</Button>
                  </form>

                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={taskSearch}
                        onChange={(e) => setTaskSearch(e.target.value)}
                        placeholder="Search tasks"
                        className="pl-8"
                      />
                    </div>
                    <select
                      value={taskCategoryFilter}
                      onChange={(e) => setTaskCategoryFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    >
                      <option value="all">All categories</option>
                      <option value="planning">Planning</option>
                      <option value="budget">Budget</option>
                      <option value="inventory">Inventory</option>
                      <option value="marketing">Marketing</option>
                      <option value="logistics">Logistics</option>
                      <option value="other">Other</option>
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => selectedOrg && fetchOrganizerWorkspace(selectedOrg._id)}
                      disabled={refreshingWorkspace}
                    >
                      <RefreshCcw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                  </div>

                  {loadingOrganizerData ? (
                    <p className="text-sm text-muted-foreground">Loading task board...</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {(['todo', 'in_progress', 'done'] as const).map((status) => {
                        const tasksByStatus = filteredTasks.filter((task) => task.status === status);
                        return (
                          <div key={status} className="rounded-lg border p-3 space-y-3 bg-muted/20">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                {status.replace('_', ' ')}
                              </p>
                              <span className="text-xs rounded-full bg-background border px-2 py-0.5">
                                {tasksByStatus.length}
                              </span>
                            </div>
                            {tasksByStatus.length === 0 ? (
                              <p className="text-xs text-muted-foreground">No tasks here yet.</p>
                            ) : (
                              tasksByStatus.map((task) => {
                                const due = task.dueDate ? new Date(task.dueDate) : null;
                                const isOverdue = !!due && due.getTime() < Date.now() && task.status !== 'done';
                                const assignedRaw = task.assignedToUserId;
                                const assignedId = typeof assignedRaw === 'string' ? assignedRaw : assignedRaw?._id;
                                const assignedMember = organizerMembers.find((member) => member.user?._id === assignedId);
                                return (
                                  <div key={task._id} className={`rounded-lg border bg-background p-3 space-y-2 ${isOverdue ? 'border-destructive/50' : ''}`}>
                                    <p className="font-medium">{task.title}</p>
                                    {task.description ? (
                                      <p className="text-xs text-muted-foreground">{task.description}</p>
                                    ) : null}
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                      <span className="rounded-full bg-muted px-2 py-0.5 capitalize">{task.category}</span>
                                      {task.budgetAmount ? <span>Rs. {task.budgetAmount}</span> : null}
                                      {due ? (
                                        <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                                          <Clock3 className="inline h-3 w-3 mr-1" />
                                          {due.toLocaleString()}
                                        </span>
                                      ) : null}
                                    </div>
                                    {assignedMember?.user ? (
                                      <p className="text-xs text-muted-foreground">
                                        Owner: {assignedMember.user.displayName || assignedMember.user.email}
                                      </p>
                                    ) : null}
                                    <div className="flex items-center gap-2 pt-1">
                                      <select
                                        value={task.status}
                                        onChange={(e) => handleTaskStatusChange(task, e.target.value as 'todo' | 'in_progress' | 'done')}
                                        className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-xs"
                                      >
                                        <option value="todo">To Do</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="done">Done</option>
                                      </select>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDeleteTask(task._id)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        );
                      })}
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
                  <CardDescription>Conversion, audience mix, workload, and event performance.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!canViewOrganizerAnalytics ? (
                    <Alert>
                      <AlertDescription>
                        Your current role does not include analytics permissions. Ask an owner/admin/moderator for access.
                      </AlertDescription>
                    </Alert>
                  ) : analyticsError ? (
                    <Alert>
                      <AlertDescription>{analyticsError}</AlertDescription>
                    </Alert>
                  ) : !organizerAnalytics?.summary ? (
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
                        <p className="text-sm font-medium mb-2">Task Throughput</p>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { key: 'todo', label: 'To Do', value: organizerAnalytics.taskBoard?.todo || 0 },
                            { key: 'inProgress', label: 'In Progress', value: organizerAnalytics.taskBoard?.inProgress || 0 },
                            { key: 'done', label: 'Done', value: organizerAnalytics.taskBoard?.done || 0 },
                          ].map((item) => (
                            <div key={item.key} className="rounded-md bg-muted/40 p-2">
                              <p className="text-xs text-muted-foreground">{item.label}</p>
                              <p className="text-lg font-semibold">{item.value}</p>
                            </div>
                          ))}
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
                        {(organizerAnalytics.eventSummaries || []).slice(0, 5).map((event) => (
                          <div key={event.eventId} className="rounded-lg border p-3">
                            <p className="font-medium">{event.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {event.checkedIn}/{event.rsvps} checked in | {event.conversionRate}% conversion | {event.averageRating || 0}/5 rating
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
                <CardDescription>
                  Channel-based communication with auto-refresh and event-specific conversation rooms.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
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
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={channelSearch}
                        onChange={(e) => setChannelSearch(e.target.value)}
                        placeholder="Search channels"
                        className="pl-8"
                      />
                    </div>
                    <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
                      {filteredChannels.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No channels found.</p>
                      ) : (
                        filteredChannels.map((channel: any) => (
                          <button
                            key={channel._id}
                            type="button"
                            onClick={() => setSelectedChannelId(channel._id)}
                            className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                              selectedChannelId === channel._id
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-muted/60'
                            }`}
                          >
                            <p className="font-medium truncate">{channel.name}</p>
                            <p className="text-xs opacity-80">
                              {channel.type} | {channel.updatedAt ? new Date(channel.updatedAt).toLocaleString() : 'just now'}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-0 overflow-hidden flex flex-col min-h-[520px]">
                  {!selectedChannelId ? (
                    <div className="p-6">
                      <p className="text-sm text-muted-foreground">Select a channel to start chatting.</p>
                    </div>
                  ) : (
                    <>
                      <div className="border-b px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{selectedChannel?.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{selectedChannel?.type} channel</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => selectedChannelId && fetchChannelMessages(selectedChannelId)}
                        >
                          <RefreshCcw className="w-4 h-4 mr-1" />
                          Refresh
                        </Button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
                        {loadingMessages ? (
                          <p className="text-sm text-muted-foreground">Loading messages...</p>
                        ) : messages.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No messages yet. Start the conversation.</p>
                        ) : (
                          messages.map((message) => {
                            const senderEmail = message.userId?.email?.toLowerCase() || '';
                            const isOwn = !!currentUserEmail && senderEmail === currentUserEmail.toLowerCase();
                            return (
                              <div key={message._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[78%] rounded-2xl px-3 py-2 ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-background border'}`}>
                                  <p className="text-xs font-medium">
                                    {message.userId?.displayName || message.userId?.email || 'Member'}
                                  </p>
                                  <p className="text-sm mt-1 whitespace-pre-wrap break-words">{message.message}</p>
                                  <p className={`text-[11px] mt-1 ${isOwn ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                    {new Date(message.createdAt).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        )}
                        <div ref={messageBottomRef} />
                      </div>
                      <form onSubmit={handleSendMessage} className="border-t p-3 flex items-center gap-2">
                        <Input
                          placeholder="Send a message to this channel"
                          value={messageDraft}
                          maxLength={500}
                          onChange={(e) => setMessageDraft(e.target.value)}
                        />
                        <Button type="submit" disabled={!messageDraft.trim()}>
                          <SendHorizontal className="h-4 w-4 mr-1" />
                          Send
                        </Button>
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
