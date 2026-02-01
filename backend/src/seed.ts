import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Organization, Event, User, OrganizationMember } from './models';

dotenv.config();

const IITK_ORGANIZATIONS = [
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

    // Create organizations and events
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

      // Create sample events for this organization
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

    console.log('Seed data created successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

seedDatabase();
