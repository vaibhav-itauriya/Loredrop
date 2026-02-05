import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.tsx';
import { interactionsAPI, authAPI } from '@/lib/api';
import { ArrowLeft, Calendar, Heart, MessageSquare, Edit2, Save, X, Image as ImageIcon, Upload } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.tsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.tsx';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton.tsx';

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
}

export default function ProfilePage() {
  const { user: authUser, isAuthenticated } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [userStats, setUserStats] = useState<UserStats>({ savedEvents: 0, upvotedEvents: 0, comments: 0 });
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ 
    displayName: '', 
    name: '', 
    rollNo: '', 
    branch: '', 
    avatar: '' 
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
    }
  }, [isAuthenticated]);

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
        localStorage.setItem('user', JSON.stringify(userData));
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to="/feed" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Feed
          </Link>
        </div>

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

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Saved Events</p>
                      <p className="text-3xl font-bold mt-1">{userStats.savedEvents}</p>
                    </div>
                    <Calendar className="w-8 h-8 text-primary opacity-50" />
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
            </div>

            {/* Saved Events Section */}
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
          </>
        )}
      </div>
    </div>
  );
}
