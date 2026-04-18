import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Organization } from '../models';

dotenv.config();

(async () => {
  await mongoose.connect(process.env.MONGODB_URI!);
  const matches = await Organization.find({
    type: 'department',
    $or: [{ name: /spo/i }, { slug: /spo/i }, { name: /placement/i }],
  });
  console.log('Found:', matches.map((o) => ({ _id: o._id, name: o.name, slug: o.slug, type: o.type })));
  for (const o of matches) {
    o.type = 'other';
    await o.save();
    console.log(`Updated ${o.name} -> type: other`);
  }
  await mongoose.connection.close();
})();
