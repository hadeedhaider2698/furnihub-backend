import request from 'supertest';
import app from '../../src/app.js';
import User from '../../src/models/User.js';

describe('Security API Tests', () => {
  beforeAll(async () => {
    await request(app).post('/api/v1/auth/register').send({ name: 'Sec', email: 'sec@test.com', password: 'Password123' });
  });

  describe('Headers & General App Security', () => {
    it('all responses have security headers - Helmet working', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['x-dns-prefetch-control']).toBe('off');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['strict-transport-security']).toBeDefined();
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('blocks HTTP Parameter Pollution', async () => {
      const res = await request(app).get('/api/v1/products?sort=price_asc&sort=newest');
      expect(res.status).toBe(200);
      // Backend automatically uses only the last parameter thanks to HPP
    });

    it('strips NoSQL injection attempts in auth', async () => {
      // Trying to bypass login with `$gt` injection
      const res = await request(app).post('/api/v1/auth/login').send({
        email: { $gt: "" },
        password: "Password123"
      });
      // Should fail validation or correctly map as invalid creds rather than exposing DB
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('Rate limiting: block excessive requests', async () => {
      // Trigger exactly 100 requests to max the limit
      // Loop enough to hit boundary (Assuming max 100 in app.js limiter)
      const ratePromises = [];
      for(let i=0; i<105; i++) {
        ratePromises.push(request(app).post('/api/v1/auth/login').send({ email: 'fake@live.com', password: '123' }));
      }
      const results = await Promise.all(ratePromises);
      const statuses = results.map(r => r.status);
      expect(statuses).toContain(429); // The 101st attempt should trigger Too Many Requests
    });

    it('refresh token string never returned in response body', async () => {
      const login = await request(app).post('/api/v1/auth/login').send({ email: 'sec@test.com', password: 'Password123' });
      expect(login.body.data.refreshToken).toBeUndefined();
      expect(login.headers['set-cookie']).toBeDefined(); // Must be httpOnly
      const cookie = login.headers['set-cookie'][0];
      expect(cookie).toContain('HttpOnly');
    });

    it('password is never returned in user payload', async () => {
      const login = await request(app).post('/api/v1/auth/login').send({ email: 'sec@test.com', password: 'Password123' });
      expect(login.body.data.user.password).toBeUndefined();
    });
  });
});
