import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Organization, Event, User, OrganizationMember } from './models';

dotenv.config();

type SeedOrg = {
  name: string;
  slug: string;
  description: string;
  type: 'council' | 'club' | 'festival' | 'department' | 'other';
  logo?: string;
  coverImage?: string;
  isVerified: boolean;
  parentSlug?: string;
};

const IITK_ORGANIZATIONS: SeedOrg[] = [
  {
    name: 'Thomso',
    slug: 'thomso',
    description: 'Annual cultural festival of IIT Kanpur celebrating art, music, and culture',
    type: 'festival' as const,
    logo: 'https://via.placeholder.com/100?text=Thomso',
    coverImage: 'https://via.placeholder.com/500?text=Thomso+Festival',
    isVerified: true,
  },
  {
    name: 'Techkriti',
    slug: 'techkriti',
    description: 'Technical fest of IIT Kanpur featuring workshops, competitions, and innovation',
    type: 'festival' as const,
    logo: 'https://via.placeholder.com/100?text=Techkriti',
    coverImage: 'https://via.placeholder.com/500?text=Techkriti',
    isVerified: true,
  },
  {
    name: 'Students\' Gymkhana',
    slug: 'students-gymkhana',
    description: 'Central student body managing sports and cultural activities at IITK',
    type: 'council' as const,
    logo: 'https://via.placeholder.com/100?text=Gymkhana',
    coverImage: 'https://via.placeholder.com/500?text=Gymkhana',
    isVerified: true,
  },
  {
    name: 'Media and Cultural Council (MnC)',
    slug: 'mnc',
    description: 'Council for media and cultural clubs at IIT Kanpur',
    type: 'council' as const,
    logo: 'https://via.placeholder.com/100?text=MnC',
    coverImage: 'https://via.placeholder.com/500?text=MnC',
    isVerified: true,
  },
  {
    name: 'Academics and Career Council (AnC)',
    slug: 'anc',
    description: 'Council supporting academics, research, and career development at IIT Kanpur',
    type: 'council' as const,
    logo: 'https://via.placeholder.com/100?text=AnC',
    coverImage: 'https://via.placeholder.com/500?text=AnC',
    isVerified: true,
  },
  {
    name: 'Games and Sports Council (GnS)',
    slug: 'gns',
    description: 'Council managing sports and hobby groups at IIT Kanpur',
    type: 'council' as const,
    logo: 'https://via.placeholder.com/100?text=GnS',
    coverImage: 'https://via.placeholder.com/500?text=GnS',
    isVerified: true,
  },
  {
    name: 'President\'s Council',
    slug: 'presidents-council',
    description: 'Council covering key student bodies and services under Students\' Gymkhana',
    type: 'council' as const,
    logo: 'https://via.placeholder.com/100?text=PC',
    coverImage: 'https://via.placeholder.com/500?text=PC',
    isVerified: true,
  },
  {
    name: 'Performing Arts Council',
    slug: 'pac',
    description: 'Council for performing arts including drama, dance, and music',
    type: 'council' as const,
    logo: 'https://via.placeholder.com/100?text=PAC',
    coverImage: 'https://via.placeholder.com/500?text=PAC',
    isVerified: true,
  },
  {
    name: 'Fine Arts and Photography Council',
    slug: 'fapc',
    description: 'Council for visual arts, photography, and design',
    type: 'council' as const,
    logo: 'https://via.placeholder.com/100?text=FAPC',
    coverImage: 'https://via.placeholder.com/500?text=FAPC',
    isVerified: true,
  },
  {
    name: 'Robotics Club',
    slug: 'robotics-club',
    description: 'Club dedicated to robotics, autonomous systems, and embedded systems',
    type: 'club' as const,
    logo: 'https://via.placeholder.com/100?text=Robotics',
    coverImage: 'https://via.placeholder.com/500?text=Robotics',
    isVerified: true,
  },
];

const IITK_COUNCIL_CLUBS: SeedOrg[] = [
  // MnC clubs
  { name: 'Anime Society', slug: 'anime-society', description: 'Anime and manga enthusiasts community', type: 'club' as const, isVerified: true, parentSlug: 'mnc' },
  { name: 'Book Club', slug: 'book-club', description: 'Reading and literary discussion club', type: 'club' as const, isVerified: true, parentSlug: 'mnc' },
  { name: 'Dance Club', slug: 'dance-club', description: 'Dance performances and workshops', type: 'club' as const, isVerified: true, parentSlug: 'mnc' },
  { name: 'Debate and Discussion Society', slug: 'debate-and-discussion', description: 'Debates, discussions, and public speaking', type: 'club' as const, isVerified: true, parentSlug: 'mnc' },
  { name: 'Design and Animation Club', slug: 'design-and-animation', description: 'Design, animation, and creative media', type: 'club' as const, isVerified: true, parentSlug: 'mnc' },
  { name: 'Dramatics Club', slug: 'dramatics-club', description: 'Theatre, acting, and stage productions', type: 'club' as const, isVerified: true, parentSlug: 'mnc' },
  { name: 'English Literary Society', slug: 'english-literary-society', description: 'Literature, writing, and oratory', type: 'club' as const, isVerified: true, parentSlug: 'mnc' },
  { name: 'Fine Arts Club', slug: 'fine-arts-club', description: 'Visual arts, sketching, and painting', type: 'club' as const, isVerified: true, parentSlug: 'mnc' },
  { name: 'Film Club', slug: 'film-club', description: 'Filmmaking, screening, and workshops', type: 'club' as const, isVerified: true, parentSlug: 'mnc' },
  { name: 'Hindi Sahitya Sabha', slug: 'hindi-sahitya-sabha', description: 'Hindi literature and creative writing', type: 'club' as const, isVerified: true, parentSlug: 'mnc' },
  { name: 'Humour House', slug: 'humour-house', description: 'Comedy writing, performance, and improv', type: 'club' as const, isVerified: true, parentSlug: 'mnc' },
  { name: 'Music Club', slug: 'music-club', description: 'Music performances, jams, and workshops', type: 'club' as const, isVerified: true, parentSlug: 'mnc' },
  { name: 'Photography Club', slug: 'photography-club', description: 'Photography and visual storytelling', type: 'club' as const, isVerified: true, parentSlug: 'mnc' },
  { name: 'Quiz Club', slug: 'quiz-club', description: 'Quizzing and trivia competitions', type: 'club' as const, isVerified: true, parentSlug: 'mnc' },
  { name: 'Student Film Society', slug: 'student-film-society', description: 'Film screenings and discussions', type: 'club' as const, isVerified: true, parentSlug: 'mnc' },

  // AnC wings (modeled as clubs)
  { name: 'Academics Wing', slug: 'anc-academics-wing', description: 'Academic support and mentoring initiatives', type: 'club' as const, isVerified: true, parentSlug: 'anc' },
  { name: 'Career Development Wing', slug: 'anc-career-development-wing', description: 'Career guidance and placement preparation', type: 'club' as const, isVerified: true, parentSlug: 'anc' },
  { name: 'Research Wing', slug: 'anc-research-wing', description: 'Research opportunities and guidance', type: 'club' as const, isVerified: true, parentSlug: 'anc' },
  { name: 'International Relations Wing', slug: 'anc-international-relations-wing', description: 'International programs and collaborations', type: 'club' as const, isVerified: true, parentSlug: 'anc' },
  { name: 'Product Club', slug: 'anc-product-club', description: 'Product management and design community', type: 'club' as const, isVerified: true, parentSlug: 'anc' },
  { name: 'Web Wing', slug: 'anc-web-wing', description: 'Web development and tech initiatives', type: 'club' as const, isVerified: true, parentSlug: 'anc' },
  { name: 'Media & Publicity Wing', slug: 'anc-media-publicity-wing', description: 'Media, outreach, and publicity', type: 'club' as const, isVerified: true, parentSlug: 'anc' },
  { name: 'Outreach & Finance Wing', slug: 'anc-outreach-finance-wing', description: 'Outreach activities and financial planning', type: 'club' as const, isVerified: true, parentSlug: 'anc' },

  // GnS clubs and hobby groups
  { name: 'Adventure Club', slug: 'adventure-club', description: 'Adventure sports and outdoor activities', type: 'club' as const, isVerified: true, parentSlug: 'gns' },
  { name: 'Card and Board Games', slug: 'card-board-games', description: 'Card and board games community', type: 'club' as const, isVerified: true, parentSlug: 'gns' },
  { name: 'Chess Club', slug: 'chess-club', description: 'Chess community and tournaments', type: 'club' as const, isVerified: true, parentSlug: 'gns' },
  { name: 'Shooting Club', slug: 'shooting-club', description: 'Shooting sports and training', type: 'club' as const, isVerified: true, parentSlug: 'gns' },
  { name: 'Skating Club', slug: 'skating-club', description: 'Skating and roller sports', type: 'club' as const, isVerified: true, parentSlug: 'gns' },
  { name: 'Taekwondo Club', slug: 'taekwondo-club', description: 'Taekwondo training and competitions', type: 'club' as const, isVerified: true, parentSlug: 'gns' },
  { name: 'Boxing Hobby Group', slug: 'boxing-hobby-group', description: 'Boxing training and fitness', type: 'club' as const, isVerified: true, parentSlug: 'gns' },
  { name: 'Bicycling Hobby Group', slug: 'bicycling-hobby-group', description: 'Cycling and endurance rides', type: 'club' as const, isVerified: true, parentSlug: 'gns' },
  { name: 'Ultimate Frisbee Hobby Group', slug: 'ultimate-frisbee-hobby-group', description: 'Ultimate frisbee community', type: 'club' as const, isVerified: true, parentSlug: 'gns' },
  { name: 'Archery Hobby Group', slug: 'archery-hobby-group', description: 'Archery practice and training', type: 'club' as const, isVerified: true, parentSlug: 'gns' },

  // President's council bodies
  { name: 'Gymkhana Lecture & Discussion Club', slug: 'gymkhana-lecture-discussion-club', description: 'Lectures and discussions under Students\' Gymkhana', type: 'club' as const, isVerified: true, parentSlug: 'presidents-council' },
  { name: 'Meander', slug: 'meander', description: 'Students\' magazine of IIT Kanpur', type: 'club' as const, isVerified: true, parentSlug: 'presidents-council' },
  { name: 'Prayas', slug: 'prayas', description: 'Community outreach and social initiatives', type: 'club' as const, isVerified: true, parentSlug: 'presidents-council' },
  { name: 'Students Placement Office', slug: 'students-placement-office', description: 'Placement coordination office', type: 'club' as const, isVerified: true, parentSlug: 'presidents-council' },
];

const SAMPLE_EVENTS = [
  {
    title: 'Thomso Opening Ceremony 2025',
    description: 'Join us for the grand opening ceremony of Thomso, featuring performances from renowned artists and cultural acts. This is the kick-off event for the week-long cultural festival.',
    venue: 'Open Air Theater, IITK',
    mode: 'offline' as const,
    tags: ['culture', 'festival', 'opening'],
    audience: ['ug', 'pg', 'phd', 'faculty', 'all'],
    registrationLink: 'https://thomso.iitk.ac.in',
  },
  {
    title: 'Battle of Bands - Thomso 2025',
    description: 'Rock the stage at Thomso\'s Battle of Bands! Participate with your band and compete for prizes and recognition. Open to all students.',
    venue: 'Main Stage, IITK',
    mode: 'offline' as const,
    tags: ['music', 'competition', 'band'],
    audience: ['ug', 'pg', 'all'],
    registrationLink: 'https://thomso.iitk.ac.in/bands',
  },
  {
    title: 'Techkriti 2025 - Tech Expo',
    description: 'Showcase of cutting-edge technologies and innovations. Visit stalls from top tech companies and research labs. Network with industry professionals.',
    venue: 'Convention Center, IITK',
    mode: 'offline' as const,
    tags: ['technology', 'expo', 'innovation'],
    audience: ['ug', 'pg', 'phd', 'faculty', 'all'],
    registrationLink: 'https://techkriti.iitk.ac.in',
  },
  {
    title: 'Coding Competition - Techkriti 2025',
    description: 'Solve challenging algorithmic problems and compete with the best programmers at IITK. Win amazing prizes and job offers!',
    venue: 'Computer Lab, IITK',
    mode: 'hybrid' as const,
    tags: ['coding', 'competition', 'programming'],
    audience: ['ug', 'pg', 'phd'],
    registrationLink: 'https://techkriti.iitk.ac.in/coding',
  },
  {
    title: 'Dance Performance - Thomso Classical Night',
    description: 'Experience the grace and elegance of classical Indian dance forms. Featuring performances by renowned dancers and our college\'s dance team.',
    venue: 'Auditorium, IITK',
    mode: 'offline' as const,
    tags: ['dance', 'classical', 'performance'],
    audience: ['ug', 'pg', 'phd', 'faculty', 'staff', 'all'],
    registrationLink: null,
  },
  {
    title: 'Photography Workshop - Capture the Moment',
    description: 'Learn professional photography techniques from expert photographers. Bring your cameras and explore the campus through a different lens.',
    venue: 'Art Studio, IITK',
    mode: 'offline' as const,
    tags: ['photography', 'workshop', 'art'],
    audience: ['ug', 'pg', 'phd', 'all'],
    registrationLink: 'https://fapc.iitk.ac.in/photography',
  },
  {
    title: 'Robotics Workshop - Build Your First Robot',
    description: 'Hands-on workshop to build a simple autonomous robot. Learn about microcontrollers, sensors, and programming. All materials provided.',
    venue: 'Robotics Lab, IITK',
    mode: 'offline' as const,
    tags: ['robotics', 'workshop', 'technology'],
    audience: ['ug', 'pg', 'phd'],
    registrationLink: 'https://robotics.iitk.ac.in',
  },
  {
    title: 'Gymkhana Sports Day 2025',
    description: 'Annual sports day featuring various athletic competitions. Participate in track events, field events, and team sports. Prizes for winners!',
    venue: 'Sports Complex, IITK',
    mode: 'offline' as const,
    tags: ['sports', 'athletics', 'competition'],
    audience: ['ug', 'pg', 'all'],
    registrationLink: 'https://gymkhana.iitk.ac.in/sports-day',
  },
];

async function seedDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not set in environment');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Clear existing data (optional - comment out if you want to preserve existing data)
    // await Organization.deleteMany({});
    // await Event.deleteMany({});
    // await OrganizationMember.deleteMany({});

    // Create a demo user
    let demoUser = await User.findOne({ email: 'demo@iitk.ac.in' });
    if (!demoUser) {
      demoUser = await User.create({
        firebaseUid: 'demo-uid-123',
        email: 'demo@iitk.ac.in',
        displayName: 'Demo Admin',
        role: 'admin',
      });
      console.log('Created demo user');
    }

    // Create base organizations
    const orgBySlug = new Map<string, any>();
    for (const orgData of IITK_ORGANIZATIONS) {
      let organization = await Organization.findOne({ slug: orgData.slug });
      if (!organization) {
        organization = await Organization.create({
          ...orgData,
          followerCount: Math.floor(Math.random() * 5000) + 100,
        });
        console.log(`Created organization: ${orgData.name}`);

        // Add demo user as admin
        await OrganizationMember.create({
          organizationId: organization._id,
          userId: demoUser._id,
          role: 'admin',
        });
      }
      orgBySlug.set(orgData.slug, organization);

      // Create sample events for this organization
      // Use existing sample list for quick demo data
      const eventsForOrg = SAMPLE_EVENTS.slice(0, 3);
      for (const eventData of eventsForOrg) {
        const existingEvent = await Event.findOne({
          title: eventData.title,
          organizationId: organization._id,
        });

        if (!existingEvent) {
          const eventDate = new Date();
          eventDate.setDate(eventDate.getDate() + Math.floor(Math.random() * 30) + 1);

          await Event.create({
            ...eventData,
            organizationId: organization._id,
            authorId: demoUser._id,
            dateTime: eventDate,
            media: [],
            upvoteCount: Math.floor(Math.random() * 200),
            commentCount: Math.floor(Math.random() * 50),
          });
          console.log(`Created event: ${eventData.title}`);
        }
      }
    }

    // Create council clubs with parent linkage
    for (const orgData of IITK_COUNCIL_CLUBS) {
      const parent = orgBySlug.get(orgData.parentSlug || '');
      if (!parent) {
        console.warn(`Parent organization not found for ${orgData.name} (${orgData.parentSlug})`);
        continue;
      }

      let organization = await Organization.findOne({ slug: orgData.slug });
      if (!organization) {
        organization = await Organization.create({
          ...orgData,
          parentOrganizationId: parent._id,
          followerCount: Math.floor(Math.random() * 5000) + 100,
        });
        console.log(`Created organization: ${orgData.name}`);

        // Add demo user as admin
        await OrganizationMember.create({
          organizationId: organization._id,
          userId: demoUser._id,
          role: 'admin',
        });
      } else if (!organization.parentOrganizationId) {
        organization.parentOrganizationId = parent._id;
        await organization.save();
      }
      orgBySlug.set(orgData.slug, organization);
    }

    console.log('Seed data created successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

seedDatabase();
