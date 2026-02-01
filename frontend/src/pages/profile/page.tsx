import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { interactionsAPI, eventsAPI } from '@/lib/api';
import { ArrowLeft, Calendar, Heart } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';

interface SavedEvent {
  _id: string;
  title: string;
  description: string;
  dateTime: string;
  location: string;
  organizationId: { name: string; logo?: string };
  capacity: number;
  upvoteCount: number;
}

export default function ProfilePage() {
  const { user, isAuthenticated } = useAuth();
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSavedEvents();
    }
  }, [isAuthenticated]);

  const fetchSavedEvents = async () => {
    try {
      setLoading(true);
      const data = await interactionsAPI.getCalendarSaves();
      setSavedEvents(data);
    } catch (err) {
      setError('Failed to load saved events');
      console.error(err);
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-screen bg-background pt-20 px-4 pb-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to="/feed" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Feed
          </Link>
        </div>

        {/* Profile Card */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-2xl">
                {user?.displayName?.charAt(0) || 'U'}
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">{user?.displayName}</CardTitle>
                <CardDescription>{user?.email}</CardDescription>
                <p className="text-sm text-muted-foreground mt-2">
                  Joined on {new Date(user?.metadata?.creationTime || '').toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

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
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground">No saved events yet</p>
                <Link to="/feed" className="mt-4 inline-block">
                  <Button variant="outline">Explore Events</Button>
                </Link>
              </div>
            ) : (
              <div className="grid gap-4">
                {savedEvents.map((event) => (
                  <div
                    key={event._id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold line-clamp-2">{event.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {event.description}
                        </p>

                        <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(event.dateTime).toLocaleDateString()}
                          </span>
                          <span>📍 {event.location}</span>
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            {event.upvoteCount} likes
                          </span>
                        </div>

                        {event.organizationId && (
                          <div className="mt-3 inline-block">
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                              {event.organizationId.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
