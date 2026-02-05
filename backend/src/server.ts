import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import * as admin from 'firebase-admin';
import { initializeEmailTransport } from './email';

import eventRoutes from './routes/events';
import interactionRoutes from './routes/interactions';
import organizationRoutes from './routes/organizations';
import authRoutes from './routes/auth';
import organizationRequestRoutes from './routes/organization-requests';

// Initialize email transporter after dotenv.config()
initializeEmailTransport();

const app = express();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow localhost on any port and specific origins
    if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      callback(null, true);
    } else if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for development
    }
  },
  credentials: true,
}));
app.use(express.json());

// Initialize Firebase Admin SDK
const firebaseCredentials = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
};

try {
  admin.initializeApp({
    credential: admin.credential.cert(firebaseCredentials as admin.ServiceAccount),
  });
  console.log('Firebase Admin SDK initialized');
} catch (error) {
  console.error('Failed to initialize Firebase:', error);
}

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/loredrop', {
  // Increase server selection timeout to give more time for DB startup
  serverSelectionTimeoutMS: 30000,
})
  .then(async () => {
    console.log('Connected to MongoDB');

    // Fix duplicate firebaseUid index issue
    try {
      const { User } = await import('./models');
      await User.collection.dropIndex('firebaseUid_1').catch(() => {});
      await User.collection.createIndex({ firebaseUid: 1 }, { sparse: true, unique: true });
      console.log('✓ Fixed firebaseUid index for email-based authentication');
    } catch (indexError) {
      console.log('Index migration note:', (indexError as any).message);
    }

    // Routes (register after successful DB connection)
    app.use('/api/events', eventRoutes);
    app.use('/api/interactions', interactionRoutes);
    app.use('/api/organizations', organizationRoutes);
    app.use('/api/auth', authRoutes);
    app.use('/api/organization-requests', organizationRequestRoutes);

    // Health check
    app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });

    const PORT = process.env.PORT || 3001;

    app.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    // Exit process when DB connection fails so the problem is visible
    process.exit(1);
  });
