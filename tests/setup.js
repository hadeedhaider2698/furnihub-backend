import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { jest } from '@jest/globals';

let mongod;

// Mock environment variables for tests
process.env.ACCESS_TOKEN_SECRET = 'mock_access_secret';
process.env.REFRESH_TOKEN_SECRET = 'mock_refresh_secret';
process.env.JWT_SECRET = 'mock_secret';
process.env.CLOUDINARY_CLOUD_NAME = 'mock';
process.env.CLOUDINARY_API_KEY = 'mock';
process.env.CLOUDINARY_API_SECRET = 'mock';
process.env.PLATFORM_FEE_PERCENT = '2.5';
process.env.ADMIN_REGISTRATION_SECRET = 'supersecret';

// ─── Global Mocks ─────────────────────────────────────────────

// Mock Upstash Redis
jest.unstable_mockModule('@upstash/redis', () => ({
  Redis: {
    fromEnv: jest.fn().mockReturnValue({
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    })
  }
}));

// Mock Cloudinary
jest.unstable_mockModule('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload: jest.fn().mockResolvedValue({
        secure_url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        public_id: 'sample_id'
      }),
      destroy: jest.fn().mockResolvedValue({ result: 'ok' })
    }
  }
}));

// Mock Nodemailer
jest.unstable_mockModule('nodemailer', () => ({
  default: {
    createTransport: jest.fn().mockReturnValue({
      sendMail: jest.fn().mockResolvedValue(true)
    })
  }
}));

// Mock Stripe
jest.unstable_mockModule('stripe', () => ({
  default: jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({ id: 'pi_mock', client_secret: 'secret_mock' })
    },
    webhooks: {
      constructEvent: jest.fn().mockReturnValue({ type: 'payment_intent.succeeded' })
    }
  }))
}));

// ─── Database Setup & Teardown ────────────────────────────────

beforeAll(async () => {
  // Disconnect if already connected
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  
  await mongoose.connect(uri);
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
    await mongoose.disconnect();
  }
  if (mongod) {
    await mongod.stop();
  }
});
