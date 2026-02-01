import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Plus, ArrowLeft, Calendar, Users, Upload, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.tsx';
import { eventsAPI } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';

interface Organization {
  _id: string;
  name: string;
  slug: string;
  description: string;
  logo?: string;
}

export default function AdminPage() {
  const { user, isAuthenticated } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
  });

  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    fetchOrganizations();
  }, [isAuthenticated]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const orgs = await eventsAPI.getOrganizations?.() || [];
      setOrganizations(orgs);
      if (orgs.length > 0) {
        setSelectedOrg(orgs[0]);
        fetchEvents(orgs[0]._id);
      }
    } catch (err) {
      setError('Failed to load organizations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async (orgId: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/events/by-organization/${orgId}`,
        {
          headers: {
            'Authorization': `Bearer ${await user?.getIdToken()}`,
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

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken()}`,
        },
        body: JSON.stringify({
          title: eventForm.title,
          description: eventForm.description,
          location: eventForm.location,
          dateTime: new Date(eventForm.dateTime).toISOString(),
          capacity: parseInt(eventForm.capacity),
          organizationId: selectedOrg._id,
          media: eventForm.imageUrl ? [{ type: 'image', url: eventForm.imageUrl }] : [],
          tags: eventForm.tags.split(',').map(t => t.trim()).filter(t => t),
          audience: eventForm.audience,
          isPublished: true,
        }),
      });

      if (response.ok) {
        setSuccessMessage('Event created successfully!');
        setEventForm({ title: '', description: '', location: '', dateTime: '', capacity: '', imageUrl: '', tags: '', audience: 'all' });
        fetchEvents(selectedOrg._id);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const error = await response.json();
        setError(error.message || 'Failed to create event');
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

  return (
    <div className="min-h-screen bg-background pt-20 px-4 pb-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to="/feed" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Feed
          </Link>
          <h1 className="text-4xl font-bold tracking-tight">Organization Admin</h1>
          <p className="text-muted-foreground mt-2">Manage your organization and create events</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
          </Alert>
        )}

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

                  <div>
                    <Label htmlFor="imageUrl">Event Image URL</Label>
                    <Input
                      id="imageUrl"
                      placeholder="https://example.com/image.jpg"
                      value={eventForm.imageUrl}
                      onChange={(e) => setEventForm({ ...eventForm, imageUrl: e.target.value })}
                    />
                    {eventForm.imageUrl && (
                      <div className="mt-2 relative inline-block">
                        <img src={eventForm.imageUrl} alt="Event preview" className="h-20 w-20 object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => setEventForm({ ...eventForm, imageUrl: '' })}
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
                      onChange={(e) => setEventForm({ ...eventForm, dateTime: e.target.value })}
                      required
                    />
                  </div>

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
      </div>
    </div>
  );
}
