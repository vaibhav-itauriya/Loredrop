import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Event, Organization, OrganizationMember, User } from './models';

dotenv.config();

const DEMO_EMAIL = 'demo@iitk.ac.in';
const EXCLUDED_ORG_SLUGS = new Set(['thomso']);

type EventMode = 'online' | 'offline' | 'hybrid';
type Audience = 'ug' | 'pg' | 'phd' | 'faculty' | 'staff' | 'all';
type EventTemplate = {
  title: string;
  description: string;
  venue: string;
  mode: EventMode;
  tags: string[];
  audience: Audience[];
  capacity: number;
  durationHours: number;
  registrationLink?: string;
};

const GENERAL_EVENT_TEMPLATES: EventTemplate[] = [
  {
    title: 'Open House Showcase',
    description:
      'A polished showcase session where the organization presents ongoing work, welcomes fresh members, and walks students through upcoming opportunities for the semester.',
    venue: 'Student Activity Center',
    mode: 'offline',
    tags: ['showcase', 'community', 'campus'],
    audience: ['ug', 'pg', 'phd', 'all'],
    capacity: 180,
    durationHours: 2,
  },
  {
    title: 'Hands-on Bootcamp',
    description:
      'A guided skill-building session with quick demos, collaborative problem solving, and take-home pointers so participants can continue exploring after the event.',
    venue: 'Lecture Hall Complex',
    mode: 'hybrid',
    tags: ['bootcamp', 'learning', 'workshop'],
    audience: ['ug', 'pg', 'phd'],
    capacity: 120,
    durationHours: 3,
  },
  {
    title: 'Night Sprint',
    description:
      'An evening collaboration block with mentors, peer teams, and focused checkpoints designed to help participants ship something real by the end of the session.',
    venue: 'New SAC Seminar Hall',
    mode: 'offline',
    tags: ['sprint', 'teamwork', 'featured'],
    audience: ['ug', 'pg', 'all'],
    capacity: 90,
    durationHours: 2.5,
  },
];

const TYPE_EVENT_TEMPLATES: Record<string, EventTemplate[]> = {
  club: [
    {
      title: 'Recruitment Jam',
      description:
        'A high-energy introduction event for curious students to meet the team, understand the workflow, and sign up for beginner-friendly tracks.',
      venue: 'Main Auditorium Foyer',
      mode: 'offline',
      tags: ['recruitment', 'orientation', 'students'],
      audience: ['ug', 'pg', 'all'],
      capacity: 220,
      durationHours: 2,
    },
    {
      title: 'Project Review Evening',
      description:
        'Teams present current builds, get rapid feedback from seniors, and identify what to polish before the next public demo or competition round.',
      venue: 'Department Seminar Room',
      mode: 'hybrid',
      tags: ['projects', 'review', 'community'],
      audience: ['ug', 'pg', 'phd'],
      capacity: 100,
      durationHours: 2,
    },
  ],
  council: [
    {
      title: 'Leadership Roundtable',
      description:
        'A structured conversation with coordinators and student representatives covering planning priorities, campus participation, and execution timelines.',
      venue: 'Senate Hall',
      mode: 'offline',
      tags: ['leadership', 'planning', 'campus'],
      audience: ['ug', 'pg', 'faculty', 'all'],
      capacity: 160,
      durationHours: 1.5,
    },
    {
      title: 'Campus Initiative Briefing',
      description:
        'A briefing session to launch new student-facing initiatives, explain rollout plans, and collect live questions from the campus community.',
      venue: 'Outreach Center',
      mode: 'hybrid',
      tags: ['initiative', 'briefing', 'community'],
      audience: ['ug', 'pg', 'staff', 'faculty', 'all'],
      capacity: 200,
      durationHours: 1.5,
    },
  ],
  festival: [
    {
      title: 'Launch Reveal',
      description:
        'A visual-first reveal event featuring the season theme, marquee highlights, timeline announcements, and opening registrations for the flagship lineup.',
      venue: 'Open Air Theatre',
      mode: 'offline',
      tags: ['festival', 'launch', 'featured'],
      audience: ['ug', 'pg', 'phd', 'faculty', 'staff', 'all'],
      capacity: 500,
      durationHours: 2,
    },
    {
      title: 'Creator Spotlight',
      description:
        'An attention-grabbing spotlight series bringing performers, builders, and campus creators together for a showcase with strong visual coverage.',
      venue: 'Main Stage',
      mode: 'offline',
      tags: ['festival', 'showcase', 'creator'],
      audience: ['ug', 'pg', 'all'],
      capacity: 320,
      durationHours: 2.5,
    },
  ],
  department: [
    {
      title: 'Research Spotlight Session',
      description:
        'A department-led event featuring short talks, student projects, and discussion around active research directions and interdisciplinary opportunities.',
      venue: 'Department Auditorium',
      mode: 'hybrid',
      tags: ['research', 'talks', 'department'],
      audience: ['ug', 'pg', 'phd', 'faculty'],
      capacity: 140,
      durationHours: 2,
      registrationLink: 'https://iitk.ac.in',
    },
  ],
  other: [
    {
      title: 'Community Connect',
      description:
        'A welcoming general-interest event designed to gather students, share updates, and create a low-friction entry point into the organization.',
      venue: 'Visitors Lounge',
      mode: 'offline',
      tags: ['community', 'connect', 'campus'],
      audience: ['ug', 'pg', 'phd', 'staff', 'all'],
      capacity: 120,
      durationHours: 1.5,
    },
  ],
};

function slugifyLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildMediaGallery(seed: string, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    type: 'image' as const,
    url: `https://picsum.photos/seed/loredrop-${seed}-${index + 1}/1400/900`,
  }));
}

function buildOrgTemplates(org: any): EventTemplate[] {
  const typeTemplates = TYPE_EVENT_TEMPLATES[String(org.type || 'other')] || TYPE_EVENT_TEMPLATES.other;
  const orgLabel = org.name || 'Campus Organization';
  const orgSlug = org.slug || slugifyLabel(orgLabel);

  return [...typeTemplates, ...GENERAL_EVENT_TEMPLATES].map((template, index) => ({
    ...template,
    title: `${orgLabel} ${template.title}`,
    description: `${orgLabel} is hosting ${template.description}`,
    registrationLink:
      template.registrationLink ||
      (template.mode !== 'offline' ? `https://example.com/${orgSlug}/event-${index + 1}` : undefined),
  }));
}

function buildEventDate(orgIndex: number, templateIndex: number) {
  const start = new Date();
  start.setSeconds(0, 0);
  start.setDate(start.getDate() + 2 + orgIndex + templateIndex);
  start.setHours(10 + ((orgIndex + templateIndex) % 7), (templateIndex % 2) * 30, 0, 0);
  return start;
}

async function ensureDemoUser() {
  let demoUser = await User.findOne({ email: DEMO_EMAIL });
  if (!demoUser) {
    demoUser = await User.create({
      firebaseUid: 'demo-uid-123',
      email: DEMO_EMAIL,
      displayName: 'Demo Admin',
      role: 'admin',
    });
    console.log('Created demo user');
  }
  return demoUser;
}

async function ensureAdminMembership(userId: mongoose.Types.ObjectId, organizationId: mongoose.Types.ObjectId) {
  const existing = await OrganizationMember.findOne({ userId, organizationId });
  if (existing) {
    if (existing.role !== 'admin' && existing.role !== 'owner') {
      existing.role = 'admin';
      await existing.save();
    }
    return;
  }

  await OrganizationMember.create({
    organizationId,
    userId,
    role: 'admin',
  });
}

async function seedDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not set in environment');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const demoUser = await ensureDemoUser();

    const organizations = await Organization.find({
      slug: { $nin: Array.from(EXCLUDED_ORG_SLUGS) },
    }).sort({ name: 1 });

    if (organizations.length === 0) {
      throw new Error('No organizations found in database. Seed organizations first or create them from the app before running this script.');
    }

    const organizationIds = organizations.map((org) => org._id);

    await Event.deleteMany({ organizationId: { $in: organizationIds } });
    console.log(`Cleared existing events for ${organizations.length} organizations`);

    let createdEvents = 0;

    for (const [orgIndex, organization] of organizations.entries()) {
      await ensureAdminMembership(demoUser._id, organization._id);

      const templates = buildOrgTemplates(organization).slice(0, 3);

      for (const [templateIndex, template] of templates.entries()) {
        const start = buildEventDate(orgIndex, templateIndex);
        const end = new Date(start.getTime() + template.durationHours * 60 * 60 * 1000);
        const mediaCount = 1 + ((orgIndex + templateIndex) % 3);
        const eventSeed = `${organization.slug || organization._id}-${templateIndex + 1}`;

        await Event.create({
          title: template.title,
          description: template.description,
          organizationId: organization._id,
          authorId: demoUser._id,
          dateTime: start,
          endDateTime: end,
          venue: template.venue,
          mode: template.mode,
          capacity: template.capacity + (orgIndex % 4) * 20,
          tags: [...template.tags, 'sample-seed'],
          audience: template.audience,
          media: buildMediaGallery(eventSeed, mediaCount),
          registrationLink: template.registrationLink,
          rsvpCount: 12 + ((orgIndex + 1) * (templateIndex + 3)) % 70,
          waitlistCount: templateIndex === 2 ? (orgIndex % 6) * 2 : 0,
          upvoteCount: 25 + ((orgIndex + templateIndex) * 11) % 180,
          commentCount: 4 + ((orgIndex + templateIndex) * 7) % 28,
          isPublished: true,
        });
        createdEvents += 1;
      }

      console.log(`Seeded events for ${organization.name}`);
    }

    console.log(`Seeded ${createdEvents} fresh sample posts across ${organizations.length} organizations`);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

seedDatabase();
