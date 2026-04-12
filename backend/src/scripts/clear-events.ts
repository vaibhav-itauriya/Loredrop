import 'dotenv/config';
import mongoose from 'mongoose';
import {
  CalendarSave,
  ChatChannel,
  ChatMessage,
  Event,
  EventComment,
  EventFeedback,
  EventRSVP,
  EventUpvote,
  Notification,
  OrganizerTask,
} from '../models';

async function clearEvents() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/loredrop';
  await mongoose.connect(mongoUri);

  const eventIds = (await Event.find({}, { _id: 1 }).lean()).map((event) => event._id);
  if (eventIds.length === 0) {
    console.log('No events found. Nothing deleted.');
    await mongoose.disconnect();
    return;
  }

  const channelIds = (await ChatChannel.find({ eventId: { $in: eventIds } }, { _id: 1 }).lean()).map(
    (channel) => channel._id
  );

  const before = {
    events: await Event.countDocuments({ _id: { $in: eventIds } }),
    upvotes: await EventUpvote.countDocuments({ eventId: { $in: eventIds } }),
    comments: await EventComment.countDocuments({ eventId: { $in: eventIds } }),
    saves: await CalendarSave.countDocuments({ eventId: { $in: eventIds } }),
    rsvps: await EventRSVP.countDocuments({ eventId: { $in: eventIds } }),
    feedback: await EventFeedback.countDocuments({ eventId: { $in: eventIds } }),
    notifications: await Notification.countDocuments({ eventId: { $in: eventIds } }),
    tasks: await OrganizerTask.countDocuments({ eventId: { $in: eventIds } }),
    channels: await ChatChannel.countDocuments({ _id: { $in: channelIds } }),
    messages: await ChatMessage.countDocuments({ channelId: { $in: channelIds } }),
  };

  const deleted = {
    messages: (await ChatMessage.deleteMany({ channelId: { $in: channelIds } })).deletedCount || 0,
    channels: (await ChatChannel.deleteMany({ _id: { $in: channelIds } })).deletedCount || 0,
    tasks: (await OrganizerTask.deleteMany({ eventId: { $in: eventIds } })).deletedCount || 0,
    notifications: (await Notification.deleteMany({ eventId: { $in: eventIds } })).deletedCount || 0,
    feedback: (await EventFeedback.deleteMany({ eventId: { $in: eventIds } })).deletedCount || 0,
    rsvps: (await EventRSVP.deleteMany({ eventId: { $in: eventIds } })).deletedCount || 0,
    saves: (await CalendarSave.deleteMany({ eventId: { $in: eventIds } })).deletedCount || 0,
    comments: (await EventComment.deleteMany({ eventId: { $in: eventIds } })).deletedCount || 0,
    upvotes: (await EventUpvote.deleteMany({ eventId: { $in: eventIds } })).deletedCount || 0,
    events: (await Event.deleteMany({ _id: { $in: eventIds } })).deletedCount || 0,
  };

  const remainingEvents = await Event.countDocuments({});

  console.log('Before:', JSON.stringify(before));
  console.log('Deleted:', JSON.stringify(deleted));
  console.log('Remaining events:', remainingEvents);

  await mongoose.disconnect();
}

clearEvents().catch(async (error) => {
  console.error('Failed to clear events:', error);
  try {
    await mongoose.disconnect();
  } catch {
    // no-op
  }
  process.exit(1);
});
