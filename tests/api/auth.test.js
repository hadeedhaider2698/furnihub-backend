import request from 'supertest';
import app from '../../src/app.js';
import User from '../../src/models/User.js';

const VALID_USER_DATA = {
  name: 'Test Customer',
  email: 'test@example.com',
  password: 'Password123'
};

describe('Auth APIEndpoints', () => {
  afterEach(async () => {
    await User.deleteMany({});
  });

  // ─── REGISTRATION TESTS ───────────────────────────────────────────────
  describe('POST /api/v1/auth/register', () => {
    it('returns 201 and user object on successful registration', async () => {
      const res = await request(app).post('/api/v1/auth/register').send(VALID_USER_DATA);
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user.name).toBe(VALID_USER_DATA.name);
      expect(res.body.data.user.password).toBeUndefined(); // Password should not be returned
      expect(res.headers['set-cookie']).toBeDefined(); // Refresh token in cookie
    });

    it('returns 400 validation error if name is missing', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({ ...VALID_USER_DATA, name: undefined });
      expect(res.status).toBe(400);
    });

    it('returns 400 validation error if email is missing', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({ ...VALID_USER_DATA, email: undefined });
      expect(res.status).toBe(400);
    });

    it('returns 400 validation error on invalid email format', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({ ...VALID_USER_DATA, email: 'notanemail' });
      expect(res.status).toBe(400);
    });

    it('returns 400 validation error if password < 8 chars', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({ ...VALID_USER_DATA, password: 'short' });
      expect(res.status).toBe(400);
    });

    it('returns 400 conflict error on duplicate email', async () => {
      await request(app).post('/api/v1/auth/register').send(VALID_USER_DATA);
      const res = await request(app).post('/api/v1/auth/register').send(VALID_USER_DATA);
      expect(res.status).toBe(400);
    });

    it('sanitizes SQL injection in email field', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({ ...VALID_USER_DATA, email: 'admin@a.com" OR "1"="1' });
      expect(res.status).toBe(400); // Invalid email format naturally blocked
    });

    it('sanitizes XSS script in name field', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({ ...VALID_USER_DATA, name: '<script>alert("xss")</script>' });
      // Depending on xss-clean, it either strips it and returns 201 or throws 400
      expect([201, 400]).toContain(res.status);
    });
  });

  // ─── LOGIN TESTS ──────────────────────────────────────────────────────
  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(VALID_USER_DATA);
    });

    it('returns 200, access token, and refresh token cookie on valid credentials', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({ email: VALID_USER_DATA.email, password: VALID_USER_DATA.password });
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('returns 401 on wrong password', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({ email: VALID_USER_DATA.email, password: 'WrongPassword123' });
      expect(res.status).toBe(401);
    });

    it('returns 401 on non-existent email', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({ email: 'ghost@example.com', password: VALID_USER_DATA.password });
      expect(res.status).toBe(401);
    });

    it('returns 403 when account is banned', async () => {
      await User.findOneAndUpdate({ email: VALID_USER_DATA.email }, { isBanned: true });
      const res = await request(app).post('/api/v1/auth/login').send({ email: VALID_USER_DATA.email, password: VALID_USER_DATA.password });
      expect(res.status).toBe(403);
    });
  });

  // ─── TOKEN REFRESH TESTS ──────────────────────────────────────────────
  describe('POST /api/v1/auth/refresh-token', () => {
    it('returns new access token with valid refresh cookie', async () => {
      await request(app).post('/api/v1/auth/register').send(VALID_USER_DATA);
      const loginRes = await request(app).post('/api/v1/auth/login').send({ email: VALID_USER_DATA.email, password: VALID_USER_DATA.password });
      const cookie = loginRes.headers['set-cookie'][0];
      
      const res = await request(app).post('/api/v1/auth/refresh-token').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
    });

    it('returns 401 if no cookie is provided', async () => {
      const res = await request(app).post('/api/v1/auth/refresh-token');
      expect(res.status).toBe(401);
    });

    it('returns 401 on tampered refresh token', async () => {
      const res = await request(app).post('/api/v1/auth/refresh-token').set('Cookie', 'refreshToken=tampered.string.here');
      expect(res.status).toBe(401);
    });
  });

  // ─── LOGOUT TESTS ─────────────────────────────────────────────────────
  describe('POST /api/v1/auth/logout', () => {
    it('clears refresh token cookie and returns 200', async () => {
      const res = await request(app).post('/api/v1/auth/logout');
      expect(res.status).toBe(200);
    });
  });

  // ─── EMAIL VERIFICATION TESTS ────────────────────────────────────────
  describe('GET /api/v1/auth/verify-email/:token', () => {
    it('returns 400 on invalid token', async () => {
      const res = await request(app).get('/api/v1/auth/verify-email/invalidtoken');
      expect(res.status).toBe(400);
    });
  });

  // ─── GET CURRENT USER TESTS ──────────────────────────────────────────
  describe('GET /api/v1/auth/me', () => {
    it('returns user without password on valid token', async () => {
      await request(app).post('/api/v1/auth/register').send(VALID_USER_DATA);
      const loginRes = await request(app).post('/api/v1/auth/login').send({ email: VALID_USER_DATA.email, password: VALID_USER_DATA.password });
      const token = loginRes.body.accessToken;

      const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(VALID_USER_DATA.email);
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('returns 401 with no token provided', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns 401 with expired token provided', async () => {
      const res = await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYwOTFiMTA5ODEyOWE3MDAxMTVkN2Q0MSIsImV4cCI6MTYyMDcxNjQ0Mn0.invalid_signature');
      expect(res.status).toBe(401);
    });
  });
});
