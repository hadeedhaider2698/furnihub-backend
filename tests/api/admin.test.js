import request from 'supertest';
import app from '../../src/app.js';
import User from '../../src/models/User.js';

describe('Admin API', () => {
  let adminToken;
  let customerToken;
  let vendorToken;
  let targetUserToBan;

  beforeAll(async () => {
    // Scaffold users
    await request(app).post('/api/v1/auth/register').send({ name: 'Admin', email: 'ad1@test.com', password: 'Password123' });
    await request(app).post('/api/v1/auth/register').send({ name: 'Cust', email: 'c1@test.com', password: 'Password123' });
    await request(app).post('/api/v1/auth/register').send({ name: 'Vend', email: 'v1@test.com', password: 'Password123' });

    // Elevate admin
    await User.findOneAndUpdate({ email: 'ad1@test.com' }, { role: 'admin' });

    adminToken = (await request(app).post('/api/v1/auth/login').send({ email: 'ad1@test.com', password: 'Password123' })).body.accessToken;
    customerToken = (await request(app).post('/api/v1/auth/login').send({ email: 'c1@test.com', password: 'Password123' })).body.accessToken;
    
    
    const customer = await User.findOne({ email: 'c1@test.com' });
    targetUserToBan = customer._id;
  });

  describe('GET /api/v1/admin/dashboard', () => {
    it('returns GMV, vendor count, order count for admin (200)', async () => {
      const res = await request(app).get('/api/v1/admin/dashboard').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.stats).toBeDefined();
    });

    it('blocks customer attempts (403)', async () => {
      const res = await request(app).get('/api/v1/admin/dashboard').set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/v1/admin/users/:id/ban', () => {
    it('bans user setting isBanned to true', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/users/${targetUserToBan}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isBanned: true });
        
      expect(res.status).toBe(200);
      const user = await User.findById(targetUserToBan);
      expect(user.isBanned).toBe(true);
    });

    it('unbans user setting isBanned to false', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/users/${targetUserToBan}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isBanned: false });
        
      expect(res.status).toBe(200);
      const user = await User.findById(targetUserToBan);
      expect(user.isBanned).toBe(false);
    });

    it('fails if admin tries to ban themselves (400)', async () => {
      const adminAcc = await User.findOne({ email: 'ad1@test.com' });
      const res = await request(app)
        .put(`/api/v1/admin/users/${adminAcc._id}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isBanned: true });
        
      expect(res.status).toBe(400); // Or 403 depending on implementation specifics
    });
  });
});
