import { useState, useEffect, useMemo } from 'react';
import { motion } from "motion/react";
import { useAuth } from '@/hooks/use-auth';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.tsx';
import { interactionsAPI, authAPI, organizerAPI, organizationsAPI, eventsAPI } from '@/lib/api';
import { ArrowLeft, Calendar, Heart, MessageSquare, Edit2, Save, X, Image as ImageIcon, Star, Award, Sparkles, Trash2, Radio, Search } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
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
} from '@/components/ui/alert-dialog.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.tsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import EventEditDialog from '@/components/EventEditDialog.tsx';

interface SavedEvent {
  _id: string;
  eventId: {
    _id: string;
    title: string;
    description: string;
    dateTime: string;
    venue: string;
    organizationId: { name: string; logo?: string };
    upvoteCount: number;
  };
  savedAt: string;
}

interface UserStats {
  savedEvents: number;
  upvotedEvents: number;
  comments: number;
  checkedInEvents?: number;
  feedbackSubmitted?: number;
}

interface ManagedEvent {
  _id: string;
  title: string;
  description: string;
  dateTime: string;
  venue: string;
  organizationId?: { _id: string; name: string; slug?: string };
  authorId?: { _id: string; displayName?: string; email?: string };
}

export default function ProfilePage() {
  const { user: authUser, isAuthenticated } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [userStats, setUserStats] = useState<UserStats>({ savedEvents: 0, upvotedEvents: 0, comments: 0 });
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>([]);
  const [managedEvents, setManagedEvents] = useState<ManagedEvent[]>([]);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [loadingManagedEvents, setLoadingManagedEvents] = useState(false);
  const [pendingFeedback, setPendingFeedback] = useState<any[]>([]);
  const [allOrganizations, setAllOrganizations] = useState<any[]>([]);
  const [subscriptionIds, setSubscriptionIds] = useState<string[]>([]);
  const [subscriptionSearch, setSubscriptionSearch] = useState('');
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [subscriptionActionId, setSubscriptionActionId] = useState<string | null>(null);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, { rating: number; feedback: string }>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: '',
    name: '',
    rollNo: '',
    branch: '',
    avatar: '',
    academicLevel: '',
    isAlumni: false,
  });
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // IITK Branches list
  const IITK_BRANCHES = [
    'Aerospace Engineering',
    'Biological Sciences and Bioengineering',
    'Chemical Engineering',
    'Chemistry',
    'Civil Engineering',
    'Computer Science and Engineering',
    'Earth Sciences',
    'Economics',
    'Electrical Engineering',
    'Energy Science and Engineering',
    'Environmental Engineering',
    'Industrial and Management Engineering',
    'Materials Science and Engineering',
    'Mathematics',
    'Mechanical Engineering',
    'Physics',
    'Statistics',
  ];

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
      fetchSavedEvents();
      fetchPendingFeedback();
      fetchSubscriptionManagerData();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchManagedEvents();
    }
  }, [isAuthenticated, authUser?._id]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await authAPI.getProfile();
      setUser(data);
      setUserStats(data.stats || { savedEvents: 0, upvotedEvents: 0, comments: 0 });
      setEditForm({
        displayName: data.displayName || '',
        name: data.name || '',
        rollNo: data.rollNo || '',
        branch: data.branch || '',
        avatar: data.avatar || '',
        academicLevel: data.academicLevel || '',
        isAlumni: !!data.isAlumni,
      });
    } catch (err) {
      setError('Failed to load profile');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedEvents = async () => {
    try {
      const data = await interactionsAPI.getCalendarSaves();
      // The API returns CalendarSave objects with populated eventId
      setSavedEvents(data);
    } catch (err) {
      console.error('Failed to load saved events:', err);
    }
  };

  const fetchManagedEvents = async () => {
    try {
      setLoadingManagedEvents(true);
      const membershipData = await organizationsAPI.getUserMemberships();
      const adminOrganizations = (membershipData?.organizations || []).filter(
        (org: any) => org.role === 'owner' || org.role === 'admin'
      );
      setIsOrgAdmin(adminOrganizations.length > 0);

      if (!adminOrganizations.length && !authUser?._id) {
        setManagedEvents([]);
        return;
      }

      const eventLists = await Promise.all(
        adminOrganizations.map((org: any) => eventsAPI.getByOrganization(org._id).catch(() => []))
      );

      const flattened = eventLists.flat();
      const authoredByUser = authUser?._id
        ? flattened.filter((event: any) => String(event.authorId?._id || event.authorId) === String(authUser._id))
        : [];
      const deduped = Array.from(
        new Map([...flattened, ...authoredByUser].map((event: any) => [event._id, event])).values()
      );

      setManagedEvents(deduped);
    } catch (err) {
      console.error('Failed to load managed events:', err);
      setIsOrgAdmin(false);
      setManagedEvents([]);
    } finally {
      setLoadingManagedEvents(false);
    }
  };

  const fetchPendingFeedback = async () => {
    try {
      const data = await organizerAPI.getPendingFeedback();
      setPendingFeedback(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load pending feedback:', err);
      setPendingFeedback([]);
    }
  };

  const fetchSubscriptionManagerData = async () => {
    try {
      setLoadingSubscriptions(true);
      const [orgs, subscriptions] = await Promise.all([
        organizationsAPI.list(),
        organizationsAPI.getMySubscriptions().catch(() => []),
      ]);
      setAllOrganizations(Array.isArray(orgs) ? orgs : []);
      setSubscriptionIds(
        Array.isArray(subscriptions)
          ? subscriptions.map((org: any) => String(org._id))
          : []
      );
    } catch (err) {
      console.error('Failed to load subscription manager data:', err);
      setAllOrganizations([]);
      setSubscriptionIds([]);
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  const handleToggleSubscription = async (organizationId: string, shouldSubscribe: boolean) => {
    try {
      setSubscriptionActionId(organizationId);
      if (shouldSubscribe) {
        await organizationsAPI.subscribeToOrganization(organizationId);
        setSubscriptionIds((prev) => (prev.includes(organizationId) ? prev : [...prev, organizationId]));
        toast.success('Organization subscribed');
      } else {
        await organizationsAPI.unsubscribeFromOrganization(organizationId);
        setSubscriptionIds((prev) => prev.filter((id) => id !== organizationId));
        toast.success('Organization unsubscribed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update subscription');
    } finally {
      setSubscriptionActionId(null);
    }
  };

  const filteredOrganizations = useMemo(() => {
    const query = subscriptionSearch.trim().toLowerCase();
    const source = [...allOrganizations].sort((a, b) => a.name.localeCompare(b.name));
    if (!query) return source;
    return source.filter((org) => {
      const haystack = [org.name, org.type, org.slug].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [allOrganizations, subscriptionSearch]);

  const handleSubmitFeedback = async (eventId: string) => {
    const draft = feedbackDrafts[eventId];
    if (!draft?.rating) {
      toast.error('Please choose a rating');
      return;
    }

    try {
      await organizerAPI.submitFeedback(eventId, draft);
      setPendingFeedback((prev) => prev.filter((event) => event._id !== eventId));
      toast.success('Thanks for sharing feedback');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit feedback');
    }
  };

  const handleDeleteManagedEvent = async (eventId: string) => {
    try {
      await eventsAPI.deleteEvent(eventId);
      setManagedEvents((prev) => prev.filter((event) => event._id !== eventId));
      toast.success('Event deleted successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete event');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingImage(true);

      // Convert to base64 data URL
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setEditForm({ ...editForm, avatar: base64String });
        toast.success('Image loaded successfully');
      };
      reader.onerror = () => {
        toast.error('Failed to read image file');
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const updated = await authAPI.updateProfile(editForm);
      setUser(updated.user);

      // Update localStorage
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        userData.displayName = updated.user.displayName;
        userData.name = updated.user.name;
        userData.rollNo = updated.user.rollNo;
        userData.branch = updated.user.branch;
        userData.avatar = updated.user.avatar;
        userData.academicLevel = updated.user.academicLevel;
        userData.isAlumni = updated.user.isAlumni;
        localStorage.setItem('user', JSON.stringify(userData));
        window.dispatchEvent(new Event('auth-state-changed'));
      }

      toast.success('Profile updated successfully!');
      setIsEditing(false);

      // Refresh profile data
      await fetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background pt-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Profile</h1>
          <p className="text-muted-foreground mb-6">Please sign in to view your profile</p>
          <Link to="/feed">
            <Button>Go to Feed</Button>
          </Link>
        </div>
      </div>
    );
  }

  const displayUser = user || authUser;

  return (
    <div className="min-h-screen bg-background pt-20 px-4 pb-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="max-w-6xl mx-auto"
      >
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.08, ease: "easeOut" }}
          className="mb-8"
        >
          <Link to="/feed" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Feed
          </Link>
        </motion.div>

        {loading && !user ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-24 w-24 rounded-full" />
                <Skeleton className="h-6 w-48 mt-4" />
                <Skeleton className="h-4 w-64 mt-2" />
              </CardHeader>
            </Card>
          </div>
        ) : (
          <>
            {/* Profile Header Card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.12, ease: "easeOut" }}
            >
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    <div className="relative">
                      <Avatar className="w-24 h-24 border-4 border-background">
                        <AvatarImage src={displayUser?.avatar} alt={displayUser?.displayName} />
                        <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-accent text-white">
                          {displayUser?.name?.charAt(0)?.toUpperCase() || displayUser?.displayName?.charAt(0)?.toUpperCase() || displayUser?.email?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      {isEditing && (
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="icon" variant="secondary" className="rounded-full w-8 h-8">
                                <ImageIcon className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Update Avatar</DialogTitle>
                                <DialogDescription>
                                  Upload an image from your device or enter an image URL
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="imageUpload">Upload from Device</Label>
                                  <div className="mt-2">
                                    <Input
                                      id="imageUpload"
                                      type="file"
                                      accept="image/*"
                                      onChange={handleImageUpload}
                                      disabled={uploadingImage}
                                      className="cursor-pointer"
                                    />
                                  </div>
                                  {uploadingImage && (
                                    <p className="text-xs text-muted-foreground mt-1">Uploading...</p>
                                  )}
                                </div>
                                <div className="relative">
                                  <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                  </div>
                                  <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                                  </div>
                                </div>
                                <div>
                                  <Label htmlFor="avatarUrl">Image URL</Label>
                                  <Input
                                    id="avatarUrl"
                                    placeholder="https://example.com/image.jpg"
                                    value={editForm.avatar}
                                    onChange={(e) => setEditForm({ ...editForm, avatar: e.target.value })}
                                  />
                                </div>
                                {editForm.avatar && (
                                  <div className="flex justify-center">
                                    <Avatar className="w-32 h-32">
                                      <AvatarImage src={editForm.avatar} />
                                      <AvatarFallback>Preview</AvatarFallback>
                                    </Avatar>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="displayName">Display Name</Label>
                            <Input
                              id="displayName"
                              value={editForm.displayName}
                              onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                              placeholder="Enter your display name"
                              maxLength={50}
                            />
                          </div>
                          <div>
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                              id="name"
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              placeholder="Enter your full name"
                              maxLength={100}
                            />
                          </div>
                          <div>
                            <Label htmlFor="rollNo">Roll Number</Label>
                            <Input
                              id="rollNo"
                              value={editForm.rollNo}
                              onChange={(e) => setEditForm({ ...editForm, rollNo: e.target.value })}
                              placeholder="Enter your roll number"
                              maxLength={20}
                            />
                          </div>
                          <div>
                            <Label htmlFor="branch">Branch</Label>
                            <Select
                              value={editForm.branch}
                              onValueChange={(value) => setEditForm({ ...editForm, branch: value })}
                            >
                              <SelectTrigger id="branch" className="w-full">
                                <SelectValue placeholder="Select your branch" />
                              </SelectTrigger>
                              <SelectContent>
                                {IITK_BRANCHES.map((branch) => (
                                  <SelectItem key={branch} value={branch}>
                                    {branch}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="academicLevel">Academic Level</Label>
                            <Select
                              value={editForm.academicLevel || ''}
                              onValueChange={(value) => setEditForm({ ...editForm, academicLevel: value })}
                            >
                              <SelectTrigger id="academicLevel" className="w-full">
                                <SelectValue placeholder="Select your academic level" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ug">Undergraduate</SelectItem>
                                <SelectItem value="pg">Postgraduate</SelectItem>
                                <SelectItem value="phd">PhD</SelectItem>
                                <SelectItem value="faculty">Faculty</SelectItem>
                                <SelectItem value="staff">Staff</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <label className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                            <input
                              type="checkbox"
                              checked={!!editForm.isAlumni}
                              onChange={(e) => setEditForm({ ...editForm, isAlumni: e.target.checked })}
                            />
                            Mark me as Alumni for mentorship and networking
                          </label>
                          <div className="flex gap-2">
                            <Button onClick={handleSaveProfile} disabled={saving} size="sm">
                              <Save className="w-4 h-4 mr-2" />
                              {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setIsEditing(false);
                                setEditForm({
                                  displayName: displayUser?.displayName || '',
                                  name: displayUser?.name || '',
                                  rollNo: displayUser?.rollNo || '',
                                  branch: displayUser?.branch || '',
                                  avatar: displayUser?.avatar || '',
                                  academicLevel: displayUser?.academicLevel || '',
                                  isAlumni: !!displayUser?.isAlumni,
                                });
                              }}
                              size="sm"
                            >
                              <X className="w-4 h-4 mr-2" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <CardTitle className="text-3xl mb-2">{displayUser?.name || displayUser?.displayName || 'User'}</CardTitle>
                          <CardDescription className="text-base">{displayUser?.name || displayUser?.displayName || displayUser?.email || 'User'}</CardDescription>
                          {displayUser?.email && displayUser?.name && (
                            <p className="text-sm text-muted-foreground mt-1">{displayUser.email}</p>
                          )}
                          {displayUser?.rollNo && (
                            <p className="text-sm text-muted-foreground mt-1">Roll No: {displayUser.rollNo}</p>
                          )}
                          {displayUser?.branch && (
                            <p className="text-sm text-muted-foreground mt-1">Branch: {displayUser.branch}</p>
                          )}
                          {displayUser?.academicLevel && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Academic Level: {String(displayUser.academicLevel).toUpperCase()}
                            </p>
                          )}
                          {displayUser?.isAlumni && (
                            <Badge variant="secondary" className="mt-3">Alumni Network</Badge>
                          )}
                          <p className="text-sm text-muted-foreground mt-2">
                            Member since {displayUser?.createdAt ? new Date(displayUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently'}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-4"
                            onClick={() => {
                              setIsEditing(true);
                              setEditForm({
                                displayName: displayUser?.displayName || '',
                                name: displayUser?.name || '',
                                rollNo: displayUser?.rollNo || '',
                                branch: displayUser?.branch || '',
                                avatar: displayUser?.avatar || '',
                                academicLevel: displayUser?.academicLevel || '',
                                isAlumni: !!displayUser?.isAlumni,
                              });
                            }}
                          >
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit Profile
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.16, ease: "easeOut" }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Campus Points</p>
                      <p className="text-3xl font-bold mt-1">{user?.points || 0}</p>
                    </div>
                    <Sparkles className="w-8 h-8 text-primary opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Upvoted Events</p>
                      <p className="text-3xl font-bold mt-1">{userStats.upvotedEvents}</p>
                    </div>
                    <Heart className="w-8 h-8 text-primary opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Comments</p>
                      <p className="text-3xl font-bold mt-1">{userStats.comments}</p>
                    </div>
                    <MessageSquare className="w-8 h-8 text-primary opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.18, ease: "easeOut" }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Badges & Milestones
                  </CardTitle>
                  <CardDescription>Recognition for your activity across campus events</CardDescription>
                </CardHeader>
                <CardContent>
                  {Array.isArray(user?.badges) && user.badges.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {user.badges.map((badge: string) => (
                        <Badge key={badge} className="rounded-full px-3 py-1">{badge}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Attend events, leave feedback, and participate in discussions to unlock badges.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Pending Feedback
                  </CardTitle>
                  <CardDescription>Share your post-event experience with organizers</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pendingFeedback.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No feedback forms are waiting for you right now.</p>
                  ) : (
                    pendingFeedback.slice(0, 3).map((event) => {
                      const draft = feedbackDrafts[event._id] || { rating: 5, feedback: '' };
                      return (
                        <div key={event._id} className="rounded-lg border p-4 space-y-3">
                          <div>
                            <p className="font-medium">{event.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {event.organizationId?.name || 'Organization'} • {new Date(event.dateTime).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <Button
                                key={rating}
                                type="button"
                                size="sm"
                                variant={draft.rating === rating ? 'default' : 'outline'}
                                onClick={() =>
                                  setFeedbackDrafts((prev) => ({
                                    ...prev,
                                    [event._id]: { ...draft, rating },
                                  }))
                                }
                              >
                                {rating}
                              </Button>
                            ))}
                          </div>
                          <Input
                            value={draft.feedback}
                            placeholder="What should organizers keep or improve?"
                            onChange={(e) =>
                              setFeedbackDrafts((prev) => ({
                                ...prev,
                                [event._id]: { ...draft, feedback: e.target.value },
                              }))
                            }
                          />
                          <Button onClick={() => handleSubmitFeedback(event._id)}>Submit Feedback</Button>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.19, ease: "easeOut" }}
            >
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Radio className="w-5 h-5" />
                        Manage Subscriptions
                      </CardTitle>
                      <CardDescription>
                        Subscribe or unsubscribe from multiple organizations and shape your subscribed feed from one place.
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="rounded-full px-3 py-1">
                        {subscriptionIds.length} subscribed
                      </Badge>
                      <Badge variant="outline" className="rounded-full px-3 py-1">
                        {allOrganizations.length} total orgs
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={subscriptionSearch}
                      onChange={(e) => setSubscriptionSearch(e.target.value)}
                      placeholder="Search organizations by name or type"
                      className="pl-9"
                    />
                  </div>

                  {loadingSubscriptions ? (
                    <div className="rounded-lg border border-dashed p-6 text-center">
                      <p className="font-medium">Loading subscriptions...</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Fetching organizations and your current subscriptions.
                      </p>
                    </div>
                  ) : filteredOrganizations.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-center">
                      <p className="font-medium">No organizations match this search</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Try a different keyword to find organizations faster.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {filteredOrganizations.map((org) => {
                        const isSubscribed = subscriptionIds.includes(String(org._id));
                        const isBusy = subscriptionActionId === String(org._id);
                        return (
                          <div key={org._id} className="rounded-xl border p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/15">
                                  {org.logo ? (
                                    <img
                                      src={org.logo}
                                      alt={org.name}
                                      className="h-7 w-7 rounded-lg object-cover"
                                    />
                                  ) : (
                                    <span className="text-sm font-bold text-primary">
                                      {org.name?.charAt(0) || 'O'}
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate font-medium">{org.name}</p>
                                  <p className="text-xs capitalize text-muted-foreground">
                                    {org.type || 'organization'}
                                  </p>
                                </div>
                              </div>
                              <Badge variant={isSubscribed ? 'secondary' : 'outline'} className="rounded-full px-2 py-1">
                                {isSubscribed ? 'Subscribed' : 'Not subscribed'}
                              </Badge>
                            </div>
                            <div className="mt-4 flex items-center justify-between gap-3">
                              <p className="text-xs text-muted-foreground">
                                {isSubscribed
                                  ? 'This organization appears in your subscribed feed.'
                                  : 'Subscribe to collect its posts in your subscribed feed.'}
                              </p>
                              <Button
                                size="sm"
                                variant={isSubscribed ? 'outline' : 'default'}
                                disabled={isBusy}
                                onClick={() => handleToggleSubscription(String(org._id), !isSubscribed)}
                              >
                                {isBusy ? 'Saving...' : isSubscribed ? 'Unsubscribe' : 'Subscribe'}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.2, ease: "easeOut" }}
            >
              {(isOrgAdmin || loadingManagedEvents) && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Edit2 className="w-5 h-5" />
                      Managed Posts
                    </CardTitle>
                    <CardDescription>
                      Posts from organizations where you are an owner or admin. Only organization admins can edit these from the profile dashboard.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingManagedEvents ? (
                      <div className="rounded-lg border border-dashed p-6 text-center">
                        <p className="font-medium">Loading managed posts...</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Checking organization admin access and fetching your event list.
                        </p>
                      </div>
                    ) : managedEvents.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-6 text-center">
                        <p className="font-medium">No managed posts yet</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          You have org admin access, but no events are currently loading into your managed posts list.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {managedEvents.map((event) => (
                          <div key={event._id} className="rounded-lg border p-4">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-lg">{event.title}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{event.description}</p>
                                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-3">
                                  <span>{new Date(event.dateTime).toLocaleString()}</span>
                                  <span>{event.venue}</span>
                                  <span>{event.organizationId?.name || 'Organization'}</span>
                                </div>
                              </div>
                              <div className="flex flex-col gap-2 sm:min-w-[150px]">
                                <EventEditDialog
                                  event={event}
                                  canEdit
                                  triggerLabel="Edit Post"
                                  onUpdated={(updated) =>
                                    setManagedEvents((prev) =>
                                      prev.map((item) => (item._id === event._id ? { ...item, ...updated } : item))
                                    )
                                  }
                                />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="destructive">
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete Post
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete this event?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will remove the event from the feed, profile dashboard, and related event interactions.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteManagedEvent(event._id)}>
                                        Delete
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
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Saved Events
                  </CardTitle>
                  <CardDescription>Events you've saved for later</CardDescription>
                </CardHeader>
                <CardContent>
                  {error && (
                    <Alert variant="destructive" className="mb-6">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {loading ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Loading saved events...</p>
                    </div>
                  ) : savedEvents.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
                      <p className="text-muted-foreground text-lg mb-2">No saved events yet</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Start saving events by clicking the calendar icon on any event card
                      </p>
                      <Link to="/feed">
                        <Button variant="outline">Explore Events</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {savedEvents.map((save) => {
                        const event = save.eventId;
                        if (!event) return null;

                        return (
                          <Link
                            key={save._id}
                            to={`/feed`}
                            className="block border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-lg line-clamp-2 mb-1">{event.title}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                  {event.description}
                                </p>

                                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(event.dateTime).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    📍 {event.venue}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Heart className="w-3 h-3" />
                                    {event.upvoteCount} likes
                                  </span>
                                </div>

                                {event.organizationId && (
                                  <div className="mt-2">
                                    <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">
                                      {event.organizationId.name}
                                    </span>
                                  </div>
                                )}

                                <p className="text-xs text-muted-foreground mt-2">
                                  Saved on {new Date(save.savedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
}
