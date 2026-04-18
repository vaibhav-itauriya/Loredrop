import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Organization } from '../models';

dotenv.config();

type DepartmentSeed = {
  name: string;
  slug: string;
  description: string;
};

const DEPARTMENTS: DepartmentSeed[] = [
  {
    name: 'Department of Biological Sciences and Bioengineering',
    slug: 'bsbe',
    description:
      'The Department of Biological Sciences and Bioengineering (BSBE) works across molecular biology, biotechnology, and bioengineering with an active research and teaching programme at IIT Kanpur.',
  },
  {
    name: 'Department of Chemical Engineering',
    slug: 'chemical-engineering',
    description:
      'The Department of Chemical Engineering at IIT Kanpur drives research and education in process systems, materials, energy, and interdisciplinary applications.',
  },
  {
    name: 'Department of Chemistry',
    slug: 'chemistry',
    description:
      'The Department of Chemistry offers a vibrant environment for teaching and research in organic, inorganic, physical, and materials chemistry.',
  },
  {
    name: 'Department of Civil Engineering',
    slug: 'civil-engineering',
    description:
      'The Department of Civil Engineering covers structures, geotechnical, environmental, transportation, and water resources engineering through research and coursework.',
  },
  {
    name: 'Department of Computer Science and Engineering',
    slug: 'cse',
    description:
      'The Department of Computer Science and Engineering (CSE) runs leading programmes in systems, theory, AI, and emerging areas of computing research.',
  },
  {
    name: 'Department of Earth Sciences',
    slug: 'earth-sciences',
    description:
      'The Department of Earth Sciences focuses on the study of the Earth system: geology, geophysics, climate, and natural hazards.',
  },
  {
    name: 'Department of Electrical Engineering',
    slug: 'electrical-engineering',
    description:
      'The Department of Electrical Engineering conducts research and teaching in power, control, communications, signal processing, VLSI, photonics, and more.',
  },
  {
    name: 'Department of Mathematics and Statistics',
    slug: 'mathematics-statistics',
    description:
      'The Department of Mathematics and Statistics covers pure and applied mathematics, statistics, and their applications across engineering and sciences.',
  },
  {
    name: 'Department of Mechanical Engineering',
    slug: 'mechanical-engineering',
    description:
      'The Department of Mechanical Engineering spans thermal-fluids, manufacturing, design, solid mechanics, and robotics with strong industry collaboration.',
  },
  {
    name: 'Department of Physics',
    slug: 'physics',
    description:
      'The Department of Physics is engaged in fundamental and applied research across condensed matter, high-energy, astrophysics, optics, and quantum information.',
  },
  {
    name: 'Department of Aerospace Engineering',
    slug: 'aerospace-engineering',
    description:
      'The Department of Aerospace Engineering covers aerodynamics, propulsion, structures, controls, and flight systems through theory, computation, and experiments.',
  },
  {
    name: 'Department of Materials Science and Engineering',
    slug: 'mse',
    description:
      'The Department of Materials Science and Engineering (MSE) works across metals, ceramics, polymers, and functional materials for structural and energy applications.',
  },
  {
    name: 'Department of Industrial and Management Engineering',
    slug: 'ime',
    description:
      'The Department of Industrial and Management Engineering (IME) focuses on operations research, supply chains, decision sciences, and management at IIT Kanpur.',
  },
  {
    name: 'Department of Humanities and Social Sciences',
    slug: 'hss',
    description:
      'The Department of Humanities and Social Sciences (HSS) hosts programmes in economics, English, philosophy, psychology, sociology, linguistics, and fine arts.',
  },
];

async function seedDepartments() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not set in environment');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    let created = 0;
    let updated = 0;

    for (const dept of DEPARTMENTS) {
      const existing = await Organization.findOne({ slug: dept.slug });
      if (existing) {
        existing.name = dept.name;
        existing.description = dept.description;
        existing.type = 'department';
        await existing.save();
        updated += 1;
        console.log(`Updated department: ${dept.name}`);
      } else {
        await Organization.create({
          name: dept.name,
          slug: dept.slug,
          description: dept.description,
          type: 'department',
          isVerified: true,
          followerCount: 0,
        });
        created += 1;
        console.log(`Created department: ${dept.name}`);
      }
    }

    console.log(`Done. Created ${created}, updated ${updated} department organizations.`);
  } catch (error) {
    console.error('Error seeding departments:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

seedDepartments();
