import request from 'supertest';
import app from './src/app.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('DB connected');

  // TRACE 1: PUBLIC GET
  const res1 = await request(app).get('/api/v1/products');
  console.log('GET /api/v1/products STATUS:', res1.status);
  console.log('GET_TRACER:', JSON.stringify(res1.body, null, 2));

  // TRACE 2: GET WITH SLUG
  const res2 = await request(app).get('/api/v1/products/slug/some-slug');
  console.log('GET /api/v1/products/slug STATUS:', res2.status);
  console.log('GET_SLUG_TRACER:', JSON.stringify(res2.body, null, 2));

  process.exit();
}).catch(e => {
  console.error(e);
  process.exit(1);
});
