# User Manual for LoreDrop

## Title Page

**User Manual for LoreDrop**  
**Version 1.0 Draft**  
**Prepared by Group No: 20**  
**Group Name: Ctrl+Alt+Elite**

| Student Name | Roll Number | IITK Email |
| --- | --- | --- |
| Aryan Chaturvedi | 230212 | aryanc23@iitk.ac.in |
| Dhruv Shetty | 230370 | sdhruv23@iitk.ac.in |
| Srujan Bhirud | 231039 | srujansb23@iitk.ac.in |
| Vaibhav Itauriya | 231115 | vaibhav23@iitk.ac.in |
| Mukund Singhal | 230670 | mukunds23@iitk.ac.in |
| Abhay Tripathi | 230035 | abhayt23@iitk.ac.in |
| Abhay Saxena | 230033 | abhaysa23@iitk.ac.in |
| Naveen Godara | 230685 | naveeng23@iitk.ac.in |
| Satwik Nimmagadda | 230702 | nsatwik23@iitk.ac.in |

**Course:** CS253  
**Mentor TA:** Vinayak Bhosle  
**Institute:** Indian Institute of Technology Kanpur  
**Document Type:** User Manual  
**Project:** LoreDrop  
**Date:** 03 April 2026

[INSERT COVER PAGE ELEMENT: LORE_DROP_BRANDING]  
[INSERT SCREENSHOT: LANDING_PAGE_HERO]

---

## Revision History

| Version | Primary Author(s) | Description of Version | Date Completed |
| --- | --- | --- | --- |
| 0.1 | Group 20 | Initial user manual draft prepared from implemented system and project documents | 03/04/2026 |
| 1.0 | Group 20 | Final submission version | [TO BE FILLED] |

---

## Table of Contents

**[PLACEHOLDER - GENERATE AUTOMATICALLY IN WORD/GOOGLE DOCS FOR FINAL SUBMISSION]**

---

## Formatting Note

This draft is written in a structure that mirrors the team SRS and SDD: numbered sections, formal subsection naming, and table-heavy presentation. For the final submitted PDF, apply the same formatting conventions already stated in the SRS:

- Section headings: Arial, Bold, Size 18
- Subsection headings: Arial, Bold, Size 14
- Sub-subsection headings: Arial, Bold, Size 12
- Body text: Arial, Size 11
- Tables: Use the same border and header style as the SRS and SDD
- Page headers/footers: Use the same project-title-and-page-number layout as the previous documents

---

# 1 Introduction

## 1.1 Purpose of This Manual

This document is the operational user manual for **LoreDrop**, a campus-focused event discovery and event management platform developed for the Indian Institute of Technology Kanpur community. The purpose of this manual is to provide a complete end-user and administrator-facing guide to the current implemented system so that students, organizers, and designated administrators can use the platform confidently without needing to inspect the source code or developer documentation.

Unlike a brief product brochure or a high-level feature list, this manual is intentionally exhaustive. It explains the visible screens, the meaning of major controls, the order of user actions, the expected system behavior after each action, and the practical limitations of the current build. Wherever useful, screenshot placeholders have been inserted so that the final submission can include UI evidence and reach report-quality page length.

[INSERT SCREENSHOT: SYSTEM_SCOPE_OVERVIEW]

## 1.2 Product Scope

LoreDrop is a campus-only web application that centralizes announcements for institute events such as talks, competitions, workshops, club activities, orientation sessions, seminars, cultural programs, and other community happenings. The platform addresses a common discovery problem at IIT Kanpur: event information is often fragmented across institute email, posters, WhatsApp groups, Instagram pages, and word-of-mouth channels. That fragmentation causes low visibility, inconsistent awareness, and loss of participation opportunities.

LoreDrop solves this by introducing a structured event feed with role-based publishing and interaction. Verified organizers can publish event posts, students can browse and personalize their event feed, and administrators can govern access to organizer privileges. The implemented system also extends beyond basic posting by including a personal event calendar, notifications, subscription-based following of organizations, comment threads, upvotes, organizer task boards, lightweight team messaging, organization profile management, and main-admin oversight workflows.

In its current implementation, LoreDrop is not merely a static bulletin board. It behaves as a hybrid of:

- A campus social feed for events
- A lightweight organizer workspace
- A personal planning assistant for students
- An approval and governance console for institute-level platform administration

## 1.3 Goals of the System

The operational goals of LoreDrop, as reflected in the implemented codebase and the provided project documents, are as follows:

1. To improve event discoverability across the IIT Kanpur campus community.
2. To reduce dependence on scattered informal announcement channels.
3. To ensure that event posts come from identifiable and manageable institute bodies.
4. To provide a cleaner, more engaging event browsing experience than plain notices.
5. To allow students to save events and compare them against their academic timetable.
6. To allow organizers to coordinate logistics, create posts, monitor response quality, and maintain organization branding.
7. To allow a designated master admin to approve organization access and manage platform-level governance tasks.

## 1.4 Intended Audience

This manual is intended for the following reader groups:

| Audience | Why This Manual Is Useful |
| --- | --- |
| IITK Students | To discover events, interact with posts, save events, and use the academic planner |
| Club and Society Representatives | To request organization access, create event posts, and manage organization presence |
| Organization Owners/Admins/Moderators | To manage public organization pages and organizer workflows |
| Main Administrator | To approve or reject organization access requests and manage higher-level platform control actions |
| CS253 Instructor and TA | To evaluate completeness, usability, and alignment between design intent and actual implementation |
| Beta Testers | To perform structured feature walkthroughs and report operational issues |

## 1.5 Document Overview

This manual is organized by user role and usage sequence.

- Section 2 explains system requirements and compatibility.
- Section 3 explains installation, startup, and first-time setup.
- Section 4 explains the complete student-facing experience.
- Section 5 explains the organizer-facing workflows.
- Section 6 explains the main-admin workflows.
- Section 7 presents troubleshooting guidance and FAQ items.
- Section 8 provides appendix material, including the group logs extracted from the team documents.

## 1.6 Important Implementation Notes

This manual is based on the current repository implementation and the supplied SRS, SDD, and Implementation Document. Therefore, it contains two kinds of statements:

- **Implemented behavior**, which is directly reflected in the codebase.
- **Deployment assumptions**, used only where the code or documents do not specify an operational value explicitly.

Important examples:

- The current build implements strong filtering on the feed, but **full keyword event search is still partial** according to the implementation document.
- The current build includes backend support for RSVP, waitlist, and check-in logic, but the visible student feed UI is centered primarily around **like, comment, save, share, follow, and calendar actions**.
- The current build recognizes a **single main admin identity** in code using the email `mukunds23@iitk.ac.in`. In a production deployment, this should ideally be configuration-driven rather than hard-coded.

---

# 2 Hardware and Software Requirements

## 2.1 Hardware Requirements

LoreDrop is a web-first application. It does not require dedicated high-end hardware, but it is intended to be used on modern desktop and mobile devices with stable internet connectivity.

### 2.1.1 Minimum Desktop/Laptop Requirements

| Component | Minimum Requirement | Recommended Requirement |
| --- | --- | --- |
| Processor | Dual-core CPU | Quad-core CPU or better |
| RAM | 4 GB | 8 GB or more |
| Storage | 500 MB free temporary space | 1 GB free space |
| Display | 1366 x 768 | 1920 x 1080 or above |
| Network | Stable Wi-Fi or Ethernet | Stable campus broadband/Wi-Fi |

### 2.1.2 Mobile Device Requirements

| Component | Minimum Requirement | Recommended Requirement |
| --- | --- | --- |
| Device Type | Android/iPhone smartphone | Recent Android/iPhone device |
| RAM | 3 GB | 4 GB or more |
| Browser Support | Modern mobile browser | Latest Chrome or Safari |
| Connectivity | Mobile data or Wi-Fi | Stable Wi-Fi for smooth media loading |

### 2.1.3 Peripheral Considerations

Some workflows become more comfortable with the following:

- A full keyboard for long comment writing and organizer content drafting
- A mouse/trackpad for dense organizer dashboard operations
- A camera or image repository when organizers need to upload event posters or cover images

## 2.2 Software Requirements

### 2.2.1 Supported Usage Model

LoreDrop is designed as a browser-based web application. No separate mobile app installation is required for the current release. The system is accessed through a URL served by the frontend application and backed by a REST API server.

### 2.2.2 Recommended Browser Baseline

The repository uses React 19, Vite 7, modern CSS, device notifications, and a component stack built on Radix UI and Tailwind CSS. Because the project documents do not pin formal browser certification numbers, the following compatibility baseline is provided as a **recommended operational target inferred from the current modern web stack**:

| Browser | Recommended Version Baseline |
| --- | --- |
| Google Chrome | 120 or later |
| Microsoft Edge | 120 or later |
| Mozilla Firefox | 121 or later |
| Safari (macOS) | 17 or later |
| Chrome for Android | 120 or later |
| Safari on iPhone/iPad | iOS 17 Safari or later |

### 2.2.3 Mobile Operating System Baseline

| Platform | Recommended Version Baseline |
| --- | --- |
| Android | Android 13 or later |
| iOS | iOS 17 or later |

### 2.2.4 Backend and Developer Runtime Requirements

For local deployment, the following are required:

| Component | Requirement |
| --- | --- |
| Node.js | Recent LTS version recommended |
| pnpm | Installed globally or available in environment |
| MongoDB | Local instance or cloud connection string |
| SMTP Credentials | Required for live email delivery |
| Firebase Admin Credentials | Required if Firebase-backed token validation is used |

## 2.3 Feature-Specific Capability Requirements

| Feature | Additional Requirement |
| --- | --- |
| Email verification | Valid IITK email address ending with `@iitk.ac.in` |
| Browser/device notifications | Browser permission must be granted |
| Image upload | Browser with file-picker support |
| Calendar export | Browser capable of downloading `.ics` files |
| Google Calendar handoff | Google account session in browser |
| Organizer workflows | Organization membership and appropriate role |
| Main-admin workflows | Access through the designated main-admin identity |

## 2.4 Recommended Network Conditions

LoreDrop loads event cards, organization metadata, profile details, notifications, and media attachments over network requests. The platform remains usable on ordinary campus internet, but the user experience improves significantly when:

- the backend API is reachable with low latency,
- media images are not excessively large,
- the browser remains connected for notification polling,
- and the user does not repeatedly lose session state due to unstable connectivity.

[INSERT SCREENSHOT: COMPATIBILITY_TABLE_PAGE]

---

# 3 Installation and Setup

## 3.1 Overview

This section covers two setup pathways:

1. **End-user setup**, where a student or organizer uses a deployed LoreDrop instance in a browser.
2. **Local deployment setup**, where the project is run from source for testing, presentation, or evaluation.

## 3.2 End-User Setup on a Deployed Instance

For a normal campus user, setup is minimal:

1. Open the LoreDrop URL in a supported browser.
2. Use an IITK email address ending in `@iitk.ac.in`.
3. Verify the email using the 6-digit code.
4. Create a password if this is the first sign-in.
5. Continue to the feed and optionally complete the profile.

## 3.3 Local Deployment Setup

### 3.3.1 Prerequisites

Ensure the following are available:

- Node.js
- pnpm
- MongoDB connection
- SMTP credentials for email delivery, or development fallback usage
- Frontend environment variables
- Backend environment variables

### 3.3.2 Repository Structure

The project is a monorepo with separate frontend and backend packages.

| Path | Purpose |
| --- | --- |
| `frontend/` | React + Vite single-page application |
| `backend/` | Express + MongoDB API server |
| `package.json` | Workspace-level scripts |
| `.env.example` | Frontend environment variable template |

### 3.3.3 Installation Steps

1. Clone the repository.
2. Open a terminal at the repository root.
3. Install workspace dependencies using:

```powershell
pnpm -w install
```

Alternatively, the workspace script may be used:

```powershell
pnpm run install-all
```

### 3.3.4 Frontend Environment Setup

The repository includes a frontend example environment file with values such as:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_API_URL`

Create a frontend environment file based on `.env.example` and ensure `VITE_API_URL` points to the backend, typically:

```text
http://localhost:3001/api
```

### 3.3.5 Backend Environment Setup

The backend reads configuration from environment variables. At minimum, local deployment should define:

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `PORT` | Backend port, default `3001` |
| `CLIENT_URL` | Optional allowed frontend origin |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | Email transport settings |
| `SMTP_USER` / `SMTP_PASSWORD` | SMTP authentication |
| `EMAIL_FROM` | Sender address |
| `FIREBASE_*` | Firebase Admin SDK credentials if used in deployment |

### 3.3.6 Running the Backend

From the repository root:

```powershell
pnpm -C backend run dev
```

### 3.3.7 Running the Frontend

From the repository root:

```powershell
pnpm -C frontend run dev
```

### 3.3.8 Health Verification

Once both services are running:

1. Open the frontend URL in a browser.
2. Confirm the landing page loads.
3. Optionally check the backend health endpoint:

```text
http://localhost:3001/health
```

### 3.3.9 Optional Seed Step

If a database seed is configured for your environment, it can be run using:

```powershell
pnpm -C backend run seed
```

[INSERT SCREENSHOT: LOCAL_SETUP_TERMINAL]  
[INSERT SCREENSHOT: HEALTH_ENDPOINT_RESPONSE]

## 3.4 User Registration Workflow

### 3.4.1 New User Registration

The implemented new-user flow is intentionally low-friction:

1. The user opens the email verification page.
2. The user enters an IITK email address.
3. The system checks whether the email ends with `@iitk.ac.in`.
4. The backend generates a 6-digit verification code.
5. The code is emailed to the user.
6. The user enters the code.
7. If the user does not yet have a password, the system asks the user to create one. The password must be at least **6 characters** long.
8. On success, the user is redirected to `/feed`.

### 3.4.2 Returning User Login

Returning users use the login page:

1. Enter IITK email.
2. Enter password.
3. Submit.
4. On successful authentication, the token is stored in local storage and the user is redirected to the feed.

### 3.4.3 Password Reset

The login page includes a **Forgot password?** action. The reset process follows the same verification-first model:

1. Move to verify-email page in reset mode.
2. Enter IITK email.
3. Receive and enter verification code.
4. Set a new password. The new password must be at least **6 characters** long.
5. Continue into the platform.

[INSERT SCREENSHOT: LOGIN_PAGE]  
[INSERT SCREENSHOT: EMAIL_VERIFICATION_PAGE]  
[INSERT SCREENSHOT: PASSWORD_CREATION_PAGE]

---

# 4 The Student Perspective

## 4.1 Overview of the Student Experience

For a student, LoreDrop is primarily a discovery-and-planning system. The major student journeys are:

- browsing the event feed,
- switching between discovery modes,
- filtering posts by time, format, audience, and organization,
- interacting with events through likes and comments,
- following organizations,
- saving events to a personal calendar,
- exporting to Google Calendar or `.ics`,
- receiving notifications,
- and maintaining a campus profile.

The interface style is visually modern rather than plain institutional. The feed uses:

- a sticky translucent top header,
- rounded cards with soft shadows,
- gradient-backed media sections,
- pill-shaped mode selectors,
- badges for date and event mode,
- and large, touch-friendly interaction buttons.

[INSERT SCREENSHOT: FEED_FULL_LAYOUT]

## 4.2 Landing and Entry

Before authentication, the student first encounters the landing page. The landing page introduces the platform idea and includes a sign-in call to action. It is intended as a lightweight orientation surface rather than the main workspace.

From here, a student can:

- understand the purpose of the platform,
- proceed to sign-in,
- or directly move into the authenticated event feed after successful login.

## 4.3 Top Navigation and Feed Header

### 4.3.1 Header Elements

| Header Element | Function |
| --- | --- |
| LoreDrop logo/wordmark | Returns to landing/root |
| `For You` button | Opens general discovery feed |
| `Subscribed` button | Shows posts from followed organizations |
| `Trending` button | Opens trending-mode feed view |
| `Upcoming` button | Opens upcoming-mode feed view |
| Filter count badge | Indicates active filter volume |
| Theme toggle | Switches between light and dark theme |
| Notification bell | Displays unread notification count |
| Avatar menu | Opens profile and role-specific actions |
| Mobile hamburger sheet | Mobile navigation alternative |

### 4.3.2 Visual Behavior

The header uses a soft white translucent background with blur, border, and shadow. On desktop, the mode buttons are grouped in a rounded pill container. On mobile, the menu collapses into a compact sheet.

[INSERT SCREENSHOT: FEED_HEADER_DESKTOP]  
[INSERT SCREENSHOT: FEED_HEADER_MOBILE]

## 4.4 Feed Modes

LoreDrop does not expose all content through one undifferentiated stream. The student can shift between feed modes.

### 4.4.1 For You

This is the default campus-wide discovery view. It is intended to surface a broad set of events. In the current implementation, the backend also supports a recommendation endpoint, and the interface includes recommendation labeling on some cards.

### 4.4.2 Subscribed

This view is shaped by organization-follow actions. If a student follows organizations, those posts can be separated into the subscribed feed. This allows more intentional personalization than the campus-wide stream.

### 4.4.3 Trending

Trending gives a separate discovery mode intended to emphasize currently active or noticeable posts. Students may use this mode when they want to catch highly visible events faster.

### 4.4.4 Upcoming

Upcoming emphasizes time-near events. This mode is especially useful during busy weeks when the student is looking for events occurring soon rather than browsing generally.

[INSERT SCREENSHOT: FEED_MODE_SWITCHER]

## 4.5 Organization Browsing and Filtering

On the feed page, organization information is not hidden deep inside each post. Students can browse and narrow content by organization through dedicated organization filter controls and follow/unfollow actions on cards.

### 4.5.1 Organization Filter Panel

The interface groups organizations and lets the student:

- select a single organization,
- combine organization selection with additional filters,
- and view a cleaner organization-focused slice of the feed.

### 4.5.2 Follow/Unfollow Behavior

Each event card includes a **Follow** or **Following** button near the organization identity area. This control allows the student to shape future discovery without leaving the feed.

When following succeeds:

- the button state changes,
- a toast confirms the action,
- and the organization becomes part of the student’s subscribed ecosystem.

### 4.5.3 Organization Public Page

Students can open an organization’s public page through card links. That page shows:

- organization name,
- type badge,
- logo or fallback visual,
- cover image if provided,
- description,
- slug,
- parent/child organization relationships where applicable,
- and events posted by that organization.

[INSERT SCREENSHOT: ORGANIZATION_FILTER_PANEL]  
[INSERT SCREENSHOT: ORGANIZATION_PUBLIC_PAGE]

## 4.6 Search and Filter Logic

### 4.6.1 Important Accuracy Note

The current LoreDrop implementation contains **strong filter support** and several targeted search surfaces, but **full-text event keyword search across the feed is still partial** according to the implementation document. Therefore, this manual describes the current discoverability logic honestly:

- **Implemented strongly:** organization filtering, date filtering, mode filtering, audience filtering, feed mode switching, subscription-based discovery
- **Implemented in selected sub-screens:** search inside personal calendar selected-date event list, organization search in profile subscription manager
- **Not fully implemented as a feed-wide polished feature:** global keyword event search bar with result highlighting

### 4.6.2 Quick Filters on Feed

The feed exposes quick chips for:

| Filter Group | Available Options |
| --- | --- |
| Date | Today, Tomorrow, This Week, This Month |
| Mode | Online, Offline, Hybrid |

These chips are compact and intended for rapid narrowing. Their visual design communicates state clearly:

- active chips use primary-colored emphasis,
- inactive chips appear muted,
- changing a chip updates feed results immediately.

### 4.6.3 More Filters Sheet

The `More` button opens a sheet panel for extended filtering. This allows the student to combine multiple criteria without cluttering the main row.

Additional filters include:

- date range,
- event mode,
- audience,
- organization selection.

### 4.6.4 Audience Logic

Audience is represented through categories such as:

- UG
- PG
- PhD
- Faculty
- Staff
- Everyone

### 4.6.5 Filter Persistence

The feed stores state locally in the browser so that feed mode, selected organization, and active filters can persist between page transitions or return visits. This improves continuity for users who repeatedly browse within one session.

[INSERT SCREENSHOT: FEED_FILTER_CHIPS]  
[INSERT SCREENSHOT: MORE_FILTERS_SHEET]

## 4.7 Event Feed Card Anatomy

The event card is the core student-facing content block. Each card is visually rich and functionally dense.

### 4.7.1 Card Visual Structure

Each card typically contains:

- a large media region at the top,
- date and mode badges over the media,
- organization identity and author information,
- event title and description,
- venue and tag metadata,
- engagement summary,
- quick action bar,
- conversation preview,
- and a more-options menu.

When no event image is provided, the platform renders an attractive fallback gradient cover with stylized event text rather than leaving the card visually empty.

### 4.7.2 Card Metadata Elements

| Card Element | Meaning |
| --- | --- |
| Date badge | Indicates whether the event is Today, Tomorrow, Past, or a specific month-day |
| Mode badge | Indicates `online`, `offline`, or `hybrid` |
| Organization avatar/logo | Points the student toward the source organization |
| Author label | Indicates who posted or authored the entry |
| Audience text | Shows intended audience |
| Venue line | Shows event location |
| Tags | Shows event labels using short pill badges |

### 4.7.3 Media Interaction

If a card contains one or more images, the student can:

- swipe or click through media,
- open the full-screen dialog gallery,
- browse larger previews,
- and inspect event visuals without leaving the feed.

[INSERT SCREENSHOT: EVENT_CARD_OVERVIEW]  
[INSERT SCREENSHOT: EVENT_CARD_MEDIA_DIALOG]

## 4.8 Student Actions on an Event

### 4.8.1 Like / Upvote

The first primary quick action is the like/upvote action. On the current UI, it appears as a button labeled **Like** with an upward arrow icon.

Behavior:

1. Student clicks `Like`.
2. If not signed in, a prompt/notification requests sign-in.
3. If signed in, the system toggles the upvote.
4. The count updates and the button style changes to an active visual state.

### 4.8.2 Comment

The `Comment` action opens the event conversation interface. Comments are shown in a bottom sheet rather than forcing a hard page transition.

The comments interface supports:

- viewing recent comments,
- reading the conversation around the event,
- writing a new comment,
- and submitting the comment inline.

### 4.8.3 Save

The `Save` button stores the event in the student’s personal LoreDrop calendar. This is one of the most important planning features in the platform.

After saving:

- the button visual changes,
- a toast confirms success,
- the item becomes available in `/calendar`,
- and reminder notifications may later be generated for saved near-future events.

### 4.8.4 Share

The `Share` button tries to use native browser sharing when available. If native sharing is unavailable, the system falls back to copying the event link.

### 4.8.5 More Menu

The more-options menu provides additional actions:

- Share Event
- Copy Event Link
- View Comments
- Save/Remove from My Calendar
- Add to Google Calendar
- Download `.ics` File
- View Organization
- Open Registration

### 4.8.6 Registration Links

If the organizer supplied a registration link, the student may open it directly through the card. The card may also show a `Learn More` button in the summary region.

[INSERT SCREENSHOT: EVENT_ACTION_BUTTONS]  
[INSERT SCREENSHOT: COMMENT_SHEET]  
[INSERT SCREENSHOT: MORE_MENU_ACTIONS]

## 4.9 Calendar Syncing and Personal Planning

LoreDrop supports multiple levels of calendar handling rather than a single simplistic bookmark list.

### 4.9.1 Save to LoreDrop Calendar

This is the internal save system. It stores the student’s chosen events in a personal planner view.

### 4.9.2 Add to Google Calendar

The platform can open a Google Calendar event template in a new browser tab. Event title, time, location, and description are passed into the calendar URL.

### 4.9.3 Download `.ics`

The `.ics` export is useful for portability. It allows use with many calendar systems including desktop mail/calendar clients and institutional workflows that accept iCalendar imports.

### 4.9.4 Personal Calendar Page

The `/calendar` page is one of the strongest student features in the current build. It combines:

- monthly event planning,
- weekly timetable mapping,
- saved-event review,
- and clash detection.

### 4.9.5 Calendar Summary Cards

At the top of the calendar page, the student sees summary cards such as:

- Saved Events
- This Month
- Weekly Classes
- Potential Clashes

### 4.9.6 Month Planner

The month planner shows:

- the current month,
- per-day event counts,
- event labels on busy dates,
- and quick visual emphasis for selected dates and activity-rich dates.

### 4.9.7 Selected Day Panel

This panel shows:

- all saved events on the chosen date,
- title,
- organization,
- mode,
- time range,
- and venue.

### 4.9.8 Weekly Timetable

Students can manually define class or lab slots. These are stored locally in the browser and are not dependent on the backend.

### 4.9.9 Clash Detection

The weekly planner compares saved event times against timetable slots for the selected week. If overlaps are found, the interface displays clash warnings and highlights the collision visually.

### 4.9.10 Saved Event Cards

The calendar page also retains full event cards lower down, so the student can still access the rich event interface without returning to the feed.

[INSERT SCREENSHOT: CALENDAR_OVERVIEW]  
[INSERT SCREENSHOT: MONTH_PLANNER]  
[INSERT SCREENSHOT: WEEKLY_TIMETABLE]  
[INSERT SCREENSHOT: CLASH_WARNING_PANEL]

## 4.10 Notifications

The notification bell is visible to authenticated users in the header.

### 4.10.1 Notification Types

The current implementation supports notification categories such as:

- event comment
- event like
- new organization event
- event reminder
- access request
- feedback request

### 4.10.2 Notification Interface

The bell displays:

- an unread badge,
- a popover list,
- per-item icons,
- timestamps,
- and a `Mark all read` option.

### 4.10.3 Device Notifications

If the browser supports system notifications and permission is granted, LoreDrop can request notification permission so alerts can also appear in the device/browser notification tray.

[INSERT SCREENSHOT: NOTIFICATION_BELL]  
[INSERT SCREENSHOT: NOTIFICATION_POPOVER]

## 4.11 Profile and Personal Identity

The profile page is not only for static information display; it is also a student control center.

### 4.11.1 Editable Fields

Students can edit:

- display name,
- full name,
- roll number,
- branch,
- avatar,
- academic level,
- alumni status.

Avatar can be provided by uploading an image file or pasting an image URL.

### 4.11.2 Points and Badges

The profile includes gamified activity signals such as campus points, upvoted event count, comment count, and earned badges.

### 4.11.3 Pending Feedback

If the student attended events and a feedback request exists, the profile page shows pending feedback cards. The student can assign a rating and submit written comments to organizers.

### 4.11.4 Manage Subscriptions

This section provides a searchable organization list where the student can search organizations by name or type, subscribe, unsubscribe, and review subscription state centrally.

### 4.11.5 Saved Events List

The profile also shows saved events in a simpler list format with title, description, date/time, venue, organization name, like count, and save timestamp.

[INSERT SCREENSHOT: PROFILE_HEADER]  
[INSERT SCREENSHOT: EDIT_PROFILE_DIALOG]  
[INSERT SCREENSHOT: SUBSCRIPTION_MANAGER]  
[INSERT SCREENSHOT: SAVED_EVENTS_PROFILE_VIEW]

---

# 5 The Organizer Perspective

## 5.1 Overview

An organizer in LoreDrop is typically an authorized representative of a club, council, festival body, department, or similar institute organization. The organizer experience spans multiple surfaces:

- request access to an organization,
- create and manage event posts,
- maintain organization identity,
- monitor task-board items,
- review organizer analytics,
- communicate through lightweight channels,
- and update public organization branding.

## 5.2 Gaining Organizer Access

### 5.2.1 Access Request Workflow

Before a normal user can behave as an organizer, they must request membership or access to an organization.

The request can be initiated from:

- the feed header avatar menu,
- or the admin page when the user has no organization membership yet.

The request modal asks the user to:

1. open the organization selector,
2. choose the target organization,
3. submit the request,
4. wait for review.

### 5.2.2 What Happens After Request Submission

After the request is submitted:

- a pending request is created in the backend,
- the main administrator receives an access-request notification,
- and the requester must wait until the request is approved or rejected.

[INSERT SCREENSHOT: REQUEST_ORGANIZATION_ACCESS_MODAL]

## 5.3 Organizer Dashboard Entry

The organizer-facing dashboard is currently exposed through the `/admin` route for non-main-admin organization members. Depending on role, the dashboard acts either as an organizer workspace or the higher-level admin console.

For a regular organizer, the dashboard includes:

- organization selector,
- event creation form,
- recent events list,
- organizer task board,
- organizer analytics,
- organizer messaging.

[INSERT SCREENSHOT: ORGANIZER_DASHBOARD_OVERVIEW]

## 5.4 Selecting an Organization

Users who are members of more than one organization can switch the active context. This matters because event creation and workspace data are tied to the selected organization.

The organization selector card shows:

- organization name,
- organization slug,
- selected state styling,
- clickable organization buttons.

When a different organization is selected:

- event list refreshes,
- workspace tasks refresh,
- channels refresh,
- analytics refresh.

## 5.5 Event Creation Form

### 5.5.1 Form Overview

The event creation form is a major organizer workflow. It is intentionally long because the system expects organizers to provide structured event data rather than vague announcements.

### 5.5.2 Form Fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| Event Title | Text | Yes | Main event heading visible on feed cards |
| Description | Multi-line text | Yes | Detailed explanation of the event |
| Event Image (file upload) | File | No | Upload poster or image from device |
| Image URL | Text/URL | No | Alternate method for providing event image |
| Tags | Comma-separated text | No | Categorization keywords |
| Location | Text | Yes | Venue/room/building label |
| Capacity | Number | Yes in current UI form | Used for headcount-related logic |
| Target Audience | Select | Yes | Everyone, UG, PG, PhD, Faculty |
| Date & Time | Date-time | Yes | Event start |
| End Time | Date-time | No | If omitted, one-hour default used for clash checking |
| Recurring Event | Checkbox | No | Enables recurrence controls |
| Recurrence Frequency | Select | Conditional | Weekly or monthly |
| Recurrence Interval | Number | Conditional | Every N weeks/months |
| Recurrence Count | Number | Conditional | Total number of occurrences |

### 5.5.3 Event Image Handling

Organizers can either:

- upload an image directly from their device, or
- paste an image URL.

The UI also shows:

- preview thumbnail,
- image clear/remove button,
- validation for file type,
- validation for size up to 5 MB.

### 5.5.4 Time Conflict Assistance

One of the strongest organizer-oriented safeguards in the current implementation is live clash detection. If the chosen time slot overlaps with existing events for the selected organization context, the form displays a conflict warning.

The organizer may:

- adjust the timing,
- or deliberately keep the same timing and proceed.

### 5.5.5 Publish Behavior

When the form is submitted successfully:

- the event is created through the backend,
- media is stored as part of event payload,
- it becomes a published event,
- organization events refresh,
- organizer workspace refreshes,
- and the event can appear in student feed discovery.

[INSERT SCREENSHOT: CREATE_EVENT_FORM_TOP]  
[INSERT SCREENSHOT: CREATE_EVENT_FORM_MEDIA]  
[INSERT SCREENSHOT: CREATE_EVENT_FORM_RECURRENCE]  
[INSERT SCREENSHOT: CREATE_EVENT_TIME_CONFLICT_ALERT]

## 5.6 Post-Management for Organizers

### 5.6.1 Recent Events Card

The organizer dashboard includes a recent events list for the selected organization. Each item presents title, description, event date, and capacity.

### 5.6.2 Editing Existing Posts

Event edit controls are available in multiple places for users with event-edit permission:

- compact edit options from event card more-menu,
- edit controls in the profile page’s managed-posts area,
- organization management views.

### 5.6.3 Deleting Existing Posts

Organizers with the necessary access can delete events. Delete actions are protected by confirmation dialogs in management surfaces to reduce accidental content loss.

### 5.6.4 Managed Posts in Profile

For organizer users who also browse as students, the profile page includes a **Managed Posts** section. This is useful because it allows quick moderation and maintenance without entering the full organizer dashboard every time.

[INSERT SCREENSHOT: RECENT_EVENTS_LIST]  
[INSERT SCREENSHOT: MANAGED_POSTS_PROFILE]

## 5.7 Organizer Task Board

The organizer dashboard contains a task board that extends LoreDrop from event publishing into operational event preparation.

### 5.7.1 Task Fields

| Field | Description |
| --- | --- |
| Task title | Short task name |
| Task notes/description | Context or rationale |
| Category | Planning, Budget, Inventory, Marketing, Logistics, Other |
| Budget | Numeric amount |
| Due date | Deadline |
| Inventory items | Comma-separated list |

### 5.7.2 Status Model

Tasks are organized into:

- `todo`
- `in_progress`
- `done`

Clicking a task advances it through the workflow cycle. This provides a lightweight kanban-style interaction without requiring a separate project-management tool.

### 5.7.3 Practical Use Cases

Examples:

- Reserve lecture hall
- Print posters
- Arrange mic and sound
- Finalize budget for refreshments
- Collect volunteer inventory list

[INSERT SCREENSHOT: ORGANIZER_TASK_BOARD]

## 5.8 Organizer Analytics

The organizer analytics panel is compact but meaningful. It helps organizations understand event outcomes and workspace quality.

### 5.8.1 Metrics Displayed

| Metric | Meaning |
| --- | --- |
| RSVP to Check-in | Conversion from expression of interest to attendance workflow |
| Average Feedback | Mean post-event rating |
| Tracked Budget | Sum of budget values reflected in workspace |
| Feedback Responses | Count of submitted attendee feedback |

### 5.8.2 Additional Analytics Elements

The interface also displays audience breakdown chips, top event summaries, conversion data, and rating data.

[INSERT SCREENSHOT: ORGANIZER_ANALYTICS]

## 5.9 Organizer Messaging

The dashboard includes a lightweight internal communication surface.

### 5.9.1 Channel Types

Channels may be:

- organization channels,
- event-specific channels.

### 5.9.2 Message Flow

The organizer can:

1. create a channel,
2. select its type,
3. attach it to a specific event if required,
4. open the channel,
5. send messages.

Messages show sender name or email, alumni marker when applicable, timestamp, and full message body.

[INSERT SCREENSHOT: ORGANIZER_MESSAGING]

## 5.10 Organization Management Page

In addition to the main organizer workspace, LoreDrop provides a dedicated organization management page at `/organizations/:slug/manage`.

### 5.10.1 Purpose

This page is focused less on event creation and more on public-identity management and ongoing organization housekeeping.

### 5.10.2 Access Roles

The page can be opened by users with manageable roles such as:

- owner
- admin
- moderator
- member

However, branding edits are restricted more tightly in the current implementation, primarily to owner and admin roles.

### 5.10.3 Editable Organization Fields

| Field | Purpose |
| --- | --- |
| Name | Public organization name |
| Slug | URL-friendly identity |
| Description | Public summary |
| Type | Club, council, festival, department, other |
| Logo | Public visual identity |
| Cover image | Hero background for organization page |

### 5.10.4 Public-Page Maintenance

This page helps organizers keep the organization’s public page polished by updating branding, descriptions, structure, and event listing quality.

[INSERT SCREENSHOT: ORGANIZATION_MANAGE_HEADER]  
[INSERT SCREENSHOT: ORGANIZATION_BRANDING_EDITOR]

---

# 6 The Admin Perspective

## 6.1 Overview

LoreDrop distinguishes between ordinary organizers and a **main administrator**. The current implementation hard-codes one main-admin identity using the email `mukunds23@iitk.ac.in`. This user receives special privileges in the admin dashboard.

The main-admin role is the current system’s central governance authority. Its responsibilities are primarily:

- reviewing organization access requests,
- assigning and removing organization admins,
- viewing platform analytics,
- supervising membership governance.

## 6.2 Main Admin Entry Conditions

When the designated main admin signs in and opens `/admin`, the dashboard exposes additional panels not shown to ordinary organization members.

If a non-main-admin user opens the admin route without organization membership, the UI instead guides them toward requesting organization access.

## 6.3 Pending Access Requests

### 6.3.1 Purpose

The pending access requests panel is the approval gateway through which ordinary campus users become organization members.

### 6.3.2 Information Displayed

Each request shows:

- requester identity,
- requester email,
- target organization,
- request timing/state context,
- approve and reject controls.

### 6.3.3 Approve Action

On approval:

- the request status changes,
- the user is added as an organization member,
- audit logging occurs,
- and the request disappears from the pending list.

### 6.3.4 Reject Action

On rejection:

- the request is closed as rejected,
- audit logging occurs,
- and it is removed from the pending panel.

[INSERT SCREENSHOT: MAIN_ADMIN_PENDING_REQUESTS]

## 6.4 Organization Admin Management

The main admin can directly manage who has elevated responsibility in each organization.

### 6.4.1 Capabilities

| Action | Meaning |
| --- | --- |
| View organization admins | Inspect current admin/owner allocation across orgs |
| Assign admin by email | Grant organization admin access directly |
| Remove admin access | Downgrade an admin to member when allowed |

### 6.4.2 Constraints

The system prevents unsafe governance changes such as removing the last admin of an organization. This is an important administrative safeguard because it reduces the chance that an organization becomes orphaned without a manager.

### 6.4.3 Assignment Workflow

To assign an organization admin:

1. Enter target user email.
2. Select organization.
3. Submit the form.
4. The user is either upgraded from member or added directly as admin.

### 6.4.4 Removal Workflow

To remove an organization admin:

1. Open the organization’s admin list.
2. Locate the admin entry.
3. Choose remove action.
4. The role is downgraded to member if allowed.

[INSERT SCREENSHOT: ORGANIZATION_ADMIN_MANAGEMENT]

## 6.5 Main Admin Analytics Overview

The platform-level analytics panel gives the main admin a broad operational view of LoreDrop itself.

### 6.5.1 Summary Metrics

| Metric | Meaning |
| --- | --- |
| Total Events | Number of published events |
| Total Saves | Number of student calendar-save actions |
| Total RSVPs | Aggregate RSVP activity tracked in backend |
| Total Check-ins | Aggregate attendance check-ins tracked in backend |

### 6.5.2 Additional Platform Intelligence

The backend also prepares richer information such as:

- top organizations,
- attendance trend,
- best posting times,
- recent audit logs.

[INSERT SCREENSHOT: MAIN_ADMIN_ANALYTICS_OVERVIEW]

## 6.6 Verification and Moderation Workflows

### 6.6.1 What Is Implemented Clearly

The implemented moderation/governance workflows currently focus most strongly on:

- organization access verification,
- organization admin assignment/removal,
- audit logging of sensitive actions,
- role-based control over organization actions.

### 6.6.2 What Is Not Yet a Dedicated Frontend Moderation Console

The current codebase does not expose a full standalone abuse-report moderation center with queues, report review cards, or content-flag dashboards in the visible frontend. Therefore, this manual should describe moderation conservatively and accurately:

- **Implemented moderation scope:** access control, membership governance, role management, audit-aware sensitive actions
- **Not yet exposed as a large UI module:** generalized report triage console for harmful posts

## 6.7 Admin Best Practices for Campus Operation

Recommended operating discipline for the main admin:

1. Review access requests regularly so genuine organizers are not blocked for long.
2. Avoid assigning too many admins to inactive organizations.
3. Never remove the only responsible admin from an active organization.
4. Use analytics trends to identify inactive or low-quality posting patterns.
5. Periodically verify that organization branding and public descriptions remain current.

[INSERT SCREENSHOT: ADMIN_FULL_DASHBOARD]

---

# 7 Troubleshooting and FAQ

## 7.1 Common Issues

### Q1. I entered my email, but the system says it is invalid.

LoreDrop currently accepts only IITK email addresses ending with `@iitk.ac.in`. If the email is typed with extra spaces, uppercase variation, or a non-IITK domain, the request will be rejected.

### Q2. I did not receive the verification code.

Check spam/promotions folders first. If the SMTP service is misconfigured in a local deployment, the code may not arrive by mail. In development environments, the backend may log fallback verification information in the console.

### Q3. The verification code expired.

Verification codes are time-bound. Request a new code and enter the latest one instead of retrying an older code.

### Q4. I verified my email but still cannot continue.

If you are a first-time user, LoreDrop may require you to create a password after code verification. This is expected behavior.

### Q5. I can log in, but I do not see notifications.

Notifications require both authenticated usage and relevant activity. For device notifications, browser permission must also be granted.

### Q6. Why can I not like, comment, or save an event?

These actions require sign-in. Anonymous browsing may still show content, but interaction is restricted.

### Q7. I saved an event, but it is not appearing in my planner immediately.

Refresh the calendar page or wait for the saved state to synchronize. Also ensure the save actually succeeded and that you are still logged into the same account.

### Q8. Google Calendar did not open correctly.

This can happen if pop-ups are blocked or the browser prevents a new tab from opening. Allow pop-ups for the LoreDrop site and retry.

### Q9. The `.ics` file downloaded, but my calendar app did not import it automatically.

This is a device/client issue rather than a LoreDrop issue. Open the file manually in a calendar application that supports iCalendar import.

### Q10. I requested organization access, but I still cannot create events.

An access request must first be approved. Until approval happens, the user remains a normal student account.

### Q11. I am an organization member, but I still cannot edit branding.

The current implementation allows page access to several roles but restricts branding edits more tightly, especially to owner/admin roles.

### Q12. My event shows a time conflict warning.

That warning is intentional. It means the selected slot overlaps an existing event. You may change the time or proceed if the overlap is acceptable.

### Q13. The feed filters feel active even after returning later.

LoreDrop stores feed state in local browser storage. Clear the active filters or reset browser storage if you want a fully fresh feed state.

### Q14. The notification bell shows unread items but I already opened them.

Open the notification popover and use `Mark all read` if some items remain unread. Some notifications also only mark as read when clicked.

### Q15. The admin dashboard says I need membership.

This means your account is not the main admin and does not currently belong to any organization with dashboard-eligible membership.

## 7.2 Quick Troubleshooting Table

| Symptom | Likely Cause | Immediate Fix |
| --- | --- | --- |
| Verification email not received | SMTP issue or spam folder | Resend code, check spam, inspect local backend logs |
| Feed not loading | Backend/API unavailable | Check frontend API URL and backend server |
| Calendar empty | No saved events or auth issue | Save events first and confirm login |
| Cannot create event | No organization access | Request and obtain approval |
| Notification permission missing | Browser has not granted permission | Enable browser notifications from popover |
| Event image not loading | Invalid URL or unsupported file | Re-upload image or use valid image URL |
| Profile changes not visible | Save not completed | Retry save and refresh profile |

[INSERT SCREENSHOT: TROUBLESHOOTING_SECTION]

---

# 8 Appendix

## Appendix A - Group Log Summary

The following material is reproduced from the supplied project documents so that the final user manual remains self-contained.

### A.1 Shared Communication Notes

- A WhatsApp group was created for communication between members.
- Offline meetings were hosted whenever necessary to take inputs from members on the project progress.
- A GitHub repository was used to collaborate during implementation.

## Appendix B - SRS Group Log

| Date and Time duration of the Meet | Meet Type | Discussions in the meet |
| --- | --- | --- |
| 11/01/2025 9:00 PM - 12:00 PM | Offline Meet | Meet to discuss the initial project idea and elaborate on real world relevance. |
| 13/01/2025 9:00 PM - 12:00 PM | Offline Meet | Discussion over what to include in software functionalities. Initial ideas on the requirement document were shared. Tasks associated with the initial draft (SRS doc) were equally distributed to each team member. |
| 18/01/2025 9:00 PM - 2:00 AM | Offline Meet | A meeting was scheduled to discuss and review the initial draft. It was decided to arrange a meeting with the client to assess how well the draft aligns with their requirements. |
| 21/01/2025 10:00 AM - 12:00 AM | Offline Meet | A meeting was held to make changes to the initial draft, ensuring that each team member contributed equally to its completion. |
| 22/01/2025 9:00 PM - 1:00 AM | Offline Meet | A meeting was held to work on UI for the draft. |
| 23/01/2025 9:00 PM - 1:00 AM | Offline Meet | A meeting was held to prepare the final draft, ensuring that each team member contributed equally to its completion. |

## Appendix C - SDD Group Log

| Note | Details |
| --- | --- |
| Communication model | Most of the group's communication is through offline meets and WhatsApp group. |
| Collaboration model | A GitHub repository was created to collaborate on code during the implementation phase. |

## Appendix D - Implementation Document Group Log

| Date and Time duration of the Meet | Meet Type | Discussions in the meet |
| --- | --- | --- |
| 11/03/2025 9:00 PM - 12:00 PM | Offline Meet | Meet to discuss the initial implementation idea. |
| 13/03/2025 9:00 PM - 12:00 PM | Offline Meet | Tasks associated with the initial draft were equally distributed to each team member. |
| 18/03/2025 9:00 PM - 2:00 AM | Offline Meet | A meeting was scheduled to discuss and review the initial draft. |
| 21/03/2025 10:00 AM - 12:00 AM | Offline Meet | A meeting was held to make changes to the initial draft, ensuring that each team member contributed equally to its completion. |
| 27/03/2025 9:00 PM - 1:00 AM | Offline Meet | A meeting was held to prepare the final draft, ensuring that each team member contributed equally to its completion. |

## Appendix E - Suggested Screenshot Inventory

| Placeholder ID | Recommended Capture |
| --- | --- |
| `LANDING_PAGE_HERO` | Full landing page hero and CTA |
| `LOGIN_PAGE` | Email/password login screen |
| `EMAIL_VERIFICATION_PAGE` | Verification code entry step |
| `FEED_FULL_LAYOUT` | Main feed with sidebars and cards |
| `FEED_HEADER_DESKTOP` | Header buttons, bell, avatar |
| `MORE_FILTERS_SHEET` | Open filter side sheet |
| `EVENT_CARD_OVERVIEW` | Complete event card on desktop |
| `COMMENT_SHEET` | Bottom-sheet comment panel |
| `NOTIFICATION_POPOVER` | Notification list with unread items |
| `CALENDAR_OVERVIEW` | Calendar dashboard with summary cards |
| `WEEKLY_TIMETABLE` | Timetable grid and clashes |
| `PROFILE_HEADER` | Profile top card |
| `SUBSCRIPTION_MANAGER` | Search and subscribe UI |
| `ORGANIZER_DASHBOARD_OVERVIEW` | `/admin` organizer view |
| `CREATE_EVENT_FORM_TOP` | Top half of event creation form |
| `CREATE_EVENT_TIME_CONFLICT_ALERT` | Conflict warning state |
| `ORGANIZER_TASK_BOARD` | Task board columns |
| `ORGANIZER_ANALYTICS` | Organizer analytics cards |
| `ORGANIZER_MESSAGING` | Messaging channels and chat panel |
| `ORGANIZATION_BRANDING_EDITOR` | Manage-organization branding tab |
| `MAIN_ADMIN_PENDING_REQUESTS` | Access request approval list |
| `ORGANIZATION_ADMIN_MANAGEMENT` | Add/remove org admins |
| `MAIN_ADMIN_ANALYTICS_OVERVIEW` | Main admin analytics cards |

---

## Final Submission Note

For the final submission document, this draft should be transferred into the same page design used for the SRS and SDD, preserving:

- heading font sizes,
- page numbering,
- page headers/footers,
- consistent table styling,
- and screenshot placement at the marked placeholder positions.

This manual is intentionally written in an expanded form so that screenshots, spacing, and styled tables can be incorporated without needing major new writing during final compilation.
