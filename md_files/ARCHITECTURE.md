# 🏗️ Loredrop - System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    LOREDROP PLATFORM                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              FIREBASE AUTHENTICATION LAYER                   │
│  • Email/Password Login                                      │
│  • Social Authentication                                     │
│  • JWT Token Management                                      │
│  • Session Persistence                                       │
└─────────────────────────────────────────────────────────────┘
         ▲                                    ▲
         │                                    │
         │ Bearer Token                      │ Firebase Config
         │                                    │
┌────────┴──────────────┐          ┌────────┴──────────────┐
│   FRONTEND (React)    │          │  BACKEND (Node.js)    │
│   Port: 5173          │◄────────►│  Port: 3001           │
└──────────┬────────────┘          └──────┬────────────────┘
           │                               │
           │ REST API Calls               │ REST API
           │ (with Auth Headers)         │ (Mongoose)
           │                               │
           │                        ┌──────▼────────────┐
           │                        │  MONGODB           │
           │                        │  Collections:      │
           │                        │  • Users           │
           │                        │  • Events          │
           │                        │  • Comments        │
           │                        │  • Upvotes         │
           │                        │  • Saves           │
           │                        │  • Notifications   │
           │                        │  • Organizations   │
           │                        └────────────────────┘
           │
           └─ Event Polling
              (10s interval)
```

---

## Frontend Architecture

```
┌─────────────────────────────────────────────┐
│          React App (React 19)               │
├─────────────────────────────────────────────┤
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │    DefaultProviders (src/App.tsx)     │ │
│  ├───────────────────────────────────────┤ │
│  │  • AuthProvider (Firebase)            │ │
│  │  • QueryClientProvider (React Query)  │ │
│  │  • TooltipProvider                    │ │
│  │  • ThemeProvider (next-themes)        │ │
│  │  • Toaster (Sonner notifications)     │ │
│  └───────────────────────────────────────┘ │
│           ▼                                 │
│  ┌──────────────────────────────────────┐  │
│  │        Router (React Router)          │  │
│  │                                       │  │
│  │  Routes:                              │  │
│  │  • /                  (Landing)       │  │
│  │  • /feed              (Main)          │  │
│  │  • /calendar          (Saved Events)  │  │
│  │  • /admin             (Admin Only)    │  │
│  │  • /profile           (User)          │  │
│  │  • /auth/callback     (Auth Flow)     │  │
│  │  • * (404)                            │  │
│  └──────────────────────────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│           UI Component Hierarchy            │
├─────────────────────────────────────────────┤
│                                             │
│  FeedHeader                                 │
│  ├── Theme Toggle (Moon/Sun)               │
│  ├── Notifications Bell                    │
│  │   └── NotificationBell Modal             │
│  ├── User Dropdown Menu                    │
│  │   ├── My Profile Link                    │
│  │   └── Admin Dashboard Link               │
│  └── Mobile Menu (Hamburger)               │
│                                             │
│  Main Feed (FeedPage)                      │
│  ├── OrganizationFilter                    │
│  ├── EventCard (repeating)                 │
│  │   ├── Upvote Button                      │
│  │   ├── Comment Section                    │
│  │   └── Calendar Save Button               │
│  └── Load More Button                      │
│                                             │
│  Admin Dashboard (AdminPage)                │
│  ├── Organization Sidebar                  │
│  └── Event Creation Form                   │
│      └── Event List                         │
│                                             │
│  Profile Page (ProfilePage)                │
│  ├── User Info Card                        │
│  └── Saved Events List                     │
│                                             │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│         API Service Layer                   │
│         (src/lib/api.ts)                   │
├─────────────────────────────────────────────┤
│                                             │
│  eventsAPI:                                 │
│  • getFeed(page, limit, orgId)             │
│  • getUpcoming(limit)                      │
│  • getEvent(eventId)                       │
│  • createEvent(data)                       │
│  • getOrganizations()                      │
│                                             │
│  interactionsAPI:                           │
│  • toggleUpvote(eventId)                   │
│  • toggleCalendarSave(eventId)             │
│  • addComment(eventId, text)               │
│  • getComments(eventId)                    │
│  • getNotifications()                      │
│  • markNotificationRead(id)                │
│  • getCalendarSaves()                      │
│                                             │
│  organizationsAPI:                          │
│  • list()                                   │
│  • getBySlug(slug)                         │
│                                             │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│      Styling & Theme Management             │
├─────────────────────────────────────────────┤
│                                             │
│  Tailwind CSS                               │
│  └── Dark Mode via next-themes              │
│      ├── Light Theme (Default)              │
│      └── Dark Theme (Optional)              │
│                                             │
│  Shadcn UI Components                       │
│  ├── Card, Button, Input                    │
│  ├── Dialog, Dropdown, Alert                │
│  ├── Toast, Skeleton, Badge                 │
│  └── And many more...                       │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Backend Architecture

```
┌──────────────────────────────────────────────┐
│      Express.js Server (Node.js)             │
│      http://localhost:3001                   │
├──────────────────────────────────────────────┤
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  Middleware Stack                      │  │
│  ├────────────────────────────────────────┤  │
│  │  1. CORS Configuration                 │  │
│  │  2. Express JSON Parser                │  │
│  │  3. Authentication Middleware          │  │
│  │     └── authMiddleware(req, res, next) │  │
│  │     └── optionalAuthMiddleware(...)    │  │
│  │  4. Error Handling                     │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  Route Handlers                        │  │
│  ├────────────────────────────────────────┤  │
│  │                                        │  │
│  │  /events (POST, GET)                   │  │
│  │  ├── GET  /feed           (paginated)  │  │
│  │  ├── GET  /upcoming       (limited)    │  │
│  │  ├── GET  /:eventId       (single)     │  │
│  │  ├── POST /               (create)     │  │
│  │  └── GET  /by-organization/:orgId      │  │
│  │                                        │  │
│  │  /interactions (POST, GET, PATCH)      │  │
│  │  ├── Upvotes                           │  │
│  │  │   ├── POST   /upvote/:eventId       │  │
│  │  │   └── GET    /upvote/:eventId/check│  │
│  │  ├── Comments                          │  │
│  │  │   ├── POST   /comments/:eventId     │  │
│  │  │   └── GET    /comments/:eventId     │  │
│  │  ├── Calendar                          │  │
│  │  │   ├── POST   /calendar/:eventId     │  │
│  │  │   ├── GET    /calendar/saved/all    │  │
│  │  │   └── GET    /calendar/:eventId/... │  │
│  │  └── Notifications                     │  │
│  │      ├── GET    /notifications         │  │
│  │      ├── PATCH  /notifications/:id/... │  │
│  │      └── PATCH  /notifications/read/.. │  │
│  │                                        │  │
│  │  /organizations (GET)                  │  │
│  │  ├── GET  /                 (list)     │  │
│  │  └── GET  /:slug             (single)  │  │
│  │                                        │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  Data Models (Mongoose)                │  │
│  ├────────────────────────────────────────┤  │
│  │  • User Schema                         │  │
│  │  • Organization Schema                 │  │
│  │  • Event Schema (Indexed)              │  │
│  │  • EventUpvote Schema (Indexed)        │  │
│  │  • EventComment Schema (Indexed)       │  │
│  │  • CalendarSave Schema (Indexed)       │  │
│  │  • Notification Schema (Indexed)       │  │
│  └────────────────────────────────────────┘  │
│                                              │
└──────────────────────────────────────────────┘
         ▼
┌──────────────────────────────────────────────┐
│         MongoDB Database                     │
│         Collections with Indexes             │
├──────────────────────────────────────────────┤
│                                              │
│  users {                                     │
│    _id, email, displayName, avatar, ...     │
│  }                                           │
│                                              │
│  organizations {                             │
│    _id, name, slug, description, logo, ...  │
│  }                                           │
│                                              │
│  events {                                    │
│    _id, title, description, dateTime,       │
│    location, organizationId, authorId,       │
│    capacity, isPublished,                    │
│    upvoteCount, commentCount                │
│    Index: { organizationId, dateTime }      │
│  }                                           │
│                                              │
│  eventupvotes {                              │
│    _id, eventId, userId, createdAt          │
│    Index: { eventId, userId }               │
│  }                                           │
│                                              │
│  eventcomments {                             │
│    _id, eventId, userId, text, createdAt    │
│    Index: { eventId }                       │
│  }                                           │
│                                              │
│  calendarsaves {                             │
│    _id, eventId, userId, createdAt          │
│    Index: { userId, eventId }               │
│  }                                           │
│                                              │
│  notifications {                             │
│    _id, userId, type, message,              │
│    eventId, read, createdAt                 │
│    Index: { userId, read }                  │
│  }                                           │
│                                              │
└──────────────────────────────────────────────┘
```

---

## Data Flow Diagram

### Creating an Event

```
User (Admin)
    ▼
Fill Event Form (AdminPage)
    ▼
Click "Create Event"
    ▼
POST /api/events
├── Include Firebase Bearer Token
└── Body: { title, description, location, dateTime, capacity, organizationId }
    ▼
Backend Route Handler
├── Verify Token (authMiddleware)
├── Validate Input
├── Create Event Document
└── Save to MongoDB
    ▼
Return: Event Object with ID
    ▼
Frontend
├── Show Toast: "Event created successfully!"
├── Clear Form
└── Fetch Updated Events List
    ▼
Refresh Event List
    ▼
New Event Visible in Admin Panel
```

### User Liking an Event

```
User Clicks ❤️ on EventCard
    ▼
handleUpvote() Function
    ▼
POST /api/interactions/upvote/:eventId
├── Include Firebase Bearer Token
└── No body required
    ▼
Backend Route Handler
├── Verify Token (authMiddleware)
├── Check if already upvoted
├── Toggle upvote status
└── Update event upvoteCount
    ▼
Return: Success
    ▼
Frontend
├── Update hasUpvoted state
├── Show Toast: "Upvoted!"
├── Update heart icon visual
└── Refresh event data
    ▼
Feed Updates (Polling)
    ▼
Other Users See Updated Count
```

### Fetching Notifications

```
User Opens App / Clicks Bell Icon
    ▼
NotificationBell Component Mounts
    ▼
Auto-Polling Starts (every 10s)
    ▼
GET /api/interactions/notifications
├── Include Firebase Bearer Token
└── Get user ID from token
    ▼
Backend Route Handler
├── Verify Token
├── Query DB for user's notifications
└── Return: Array of notifications
    ▼
Frontend Updates State
├── Set notifications array
├── Calculate unreadCount
├── Update badge
└── Show/Hide modal
    ▼
User Sees Notification History
```

---

## Request/Response Flow

### API Request with Authentication

```javascript
// Frontend Request
const token = await user.getIdToken();
fetch('http://localhost:3001/api/events', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})

// Backend Processing
middleware.authMiddleware
├── Extract token from header
├── Verify with Firebase
├── Decode token
└── Add req.userId to request

// Route Handler
try {
  // Use req.userId for user-specific queries
  const userEvents = await Event.find({ authorId: req.userId })
  res.json(userEvents)
} catch (error) {
  res.status(500).json({ error: 'Failed to fetch' })
}
```

---

## State Management

### Frontend State
```
App-Level State:
├── User (from useAuth hook)
├── Theme (from useTheme hook)
└── Query Client Cache (React Query)

Component-Level State (useState):
├── FeedPage
│   ├── events
│   ├── selectedOrgId
│   ├── page (pagination)
│   └── isLoading
├── AdminPage
│   ├── organizations
│   ├── selectedOrg
│   ├── events
│   └── eventForm
├── EventCard
│   ├── hasUpvoted
│   ├── hasCalendarSave
│   ├── comments
│   └── showComments
└── NotificationBell
    ├── notifications
    ├── unreadCount
    └── open
```

---

## Authentication Flow

```
1. User Clicks Sign In
    ▼
2. Firebase Auth Modal
    ▼
3. User Enters Credentials (or Social)
    ▼
4. Firebase Authenticates
    ▼
5. Token Generated
    ▼
6. Redirect to /auth/callback
    ▼
7. useAuth Hook Stores Token (Firebase handles)
    ▼
8. Redirect to /feed
    ▼
9. All API Calls Include Bearer Token
    ▼
10. Backend Verifies Token with Firebase Admin SDK
    ▼
11. Access Granted/Denied
```

---

## Real-Time Updates Strategy

### Polling Mechanism

```
Event Feed
    ▼
User Opens Page
    ▼
Fetch Events (getFeed)
    ▼
Set Interval (10s)
    ▼
Every 10 seconds:
├── Check for new events
├── Update event counts
├── Refresh notification count
└── Update state if changed
    ▼
Continue until:
├── User navigates away, OR
├── Modal closes, OR
└── Component unmounts
```

---

## Component Communication

```
App.tsx (Routes)
    ├── FeedPage
    │   ├── FeedHeader
    │   │   ├── NotificationBell (via Portal)
    │   │   ├── ThemeToggle
    │   │   └── UserMenu
    │   ├── OrganizationFilter
    │   ├── EventCard (multiple)
    │   │   ├── Upvote Button
    │   │   ├── Comment Section
    │   │   └── Save Button
    │   └── UpcomingEventsSidebar
    │
    ├── AdminPage
    │   ├── Organization Selector
    │   ├── Event Creation Form
    │   └── Event List
    │
    ├── ProfilePage
    │   ├── User Info Card
    │   └── Saved Events List
    │
    └── CalendarPage
        ├── Calendar View
        └── Event List

Global Providers
    ├── AuthProvider (Firebase)
    ├── ThemeProvider (next-themes)
    ├── QueryClientProvider (React Query)
    └── TooltipProvider
```

---

## Error Handling Strategy

```
Frontend Errors:
├── API Errors
│   ├── 400 Bad Request
│   ├── 401 Unauthorized
│   ├── 404 Not Found
│   └── 500 Server Error
├── Form Validation
├── Missing Data
└── Network Issues

Display To User:
├── Toast Notifications (errors)
├── Alert Components
├── Empty States
└── Loading Skeletons

Backend Errors:
├── Authentication Failures
├── Database Errors
├── Validation Errors
└── Server Errors

Response Format:
{
  error: "Error message",
  status: 400
}
```

---

## Performance Considerations

### Frontend Optimization
- ✅ Code splitting via Vite
- ✅ Lazy loading routes
- ✅ Component memoization where needed
- ✅ Image optimization
- ✅ Efficient re-renders

### Backend Optimization
- ✅ Database indexes on frequently queried fields
- ✅ Pagination on large datasets
- ✅ Efficient queries (populate only needed fields)
- ✅ Caching strategies possible
- ✅ Rate limiting ready

### Monitoring Points
- Event load time
- API response times
- Database query times
- Bundle size
- Memory usage

---

## Deployment Architecture

```
Production Environment:

┌─────────────────────────────────────────┐
│          Frontend (Vercel/Netlify)      │
├─────────────────────────────────────────┤
│  • Built React app (dist/)              │
│  • CDN Distribution                     │
│  • Environment: VITE_API_URL            │
│  • URL: https://loredrop.com            │
└─────────────────────────────────────────┘
         ▲                       ▼
         │                    API Calls
         │                       │
         ▼                       ▼
┌─────────────────────────────────────────┐
│    Backend (Heroku/Railway/DigitalOcean)│
├─────────────────────────────────────────┤
│  • Node.js Server                       │
│  • Environment: NODE_ENV=production     │
│  • Port: 3001 (internal)                │
│  • URL: https://api.loredrop.com        │
└─────────────────────────────────────────┘
         ▼
┌─────────────────────────────────────────┐
│    MongoDB (Atlas)                      │
├─────────────────────────────────────────┤
│  • Cloud Database                       │
│  • Automatic Backups                    │
│  • Connection Pooling                   │
│  • Encryption at Rest                   │
└─────────────────────────────────────────┘
         ▼
┌─────────────────────────────────────────┐
│    Firebase (Google Cloud)              │
├─────────────────────────────────────────┤
│  • Authentication Service               │
│  • Token Management                     │
│  • Security Rules                       │
└─────────────────────────────────────────┘
```

---

This architecture provides:
✅ Clear separation of concerns
✅ Scalable design
✅ Maintainable codebase
✅ Secure authentication
✅ Efficient data flow
✅ Real-time capabilities
✅ Error handling throughout
