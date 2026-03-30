import request from 'supertest';
import app from '../../src/app.js';
import User from '../../src/models/User.js';
import VendorProfile from '../../src/models/VendorProfile.js';

describe('Vendors API', () => {
  let customerToken;
  let testVendorId;

  beforeAll(async () => {
    await request(app).post('/api/v1/auth/register').send({ name: 'Vendor Cust', email: 'vc@v.com', password: 'Password123' });
    customerToken = (await request(app).post('/api/v1/auth/login').send({ email: 'vc@v.com', password: 'Password123' })).body.accessToken;
  });

  describe('POST /api/v1/vendors/register', () => {
    it('customer becomes vendor, creating profile and modifying role to vendor', async () => {
      const vendorData = {
        shopName: 'Super Furniture',
        description: 'Quality Goods',
        contactPhone: '12345678',
        contactEmail: 'shop@super.com',
        address: { street: '1', city: 'KHI', state: 'S', zipCode: '75', country: 'PK' }
      };

      const res = await request(app).post('/api/v1/vendors/register').set('Authorization', `Bearer ${customerToken}`).send(vendorData);
      expect(res.status).toBe(201);
      expect(res.body.data.vendor.shopName).toBe(vendorData.shopName);
      
      testVendorId = res.body.data.vendor._id;
      
      const user = await User.findOne({ email: 'vc@v.com' });
      expect(user.role).toBe('vendor');
    });

    it('fails with 400 if already a vendor', async () => {
      const vendorData = { shopName: 'Super Furniture 2' };
      const res = await request(app).post('/api/v1/vendors/register').set('Authorization', `Bearer ${customerToken}`).send(vendorData);
      expect(res.status).toBe(400); // Already registered
    });

    it('fails if missing shopName', async () => {
      const res = await request(app).post('/api/v1/vendors/register').set('Authorization', `Bearer ${customerToken}`).send({});
      expect(res.status).toBe(400); // Because Joi validation will kick back before 409
    });
  });

  describe('GET /api/v1/vendors/:id', () => {
    it('public profile visible without auth', async () => {
      await VendorProfile.findByIdAndUpdate(testVendorId, { isApproved: true });
      const res = await request(app).get(`/api/v1/vendors/${testVendorId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.vendor.shopName).toBe('Super Furniture');
    });

    it('returns 404 for non-existent vendor', async () => {
      const validButFakeMongoId = testVendorId.toString().replace(/.$/, 'a'); // Slight mod
      const res = await request(app).get(`/api/v1/vendors/${validButFakeMongoId}`);
      expect(res.status).toBe(404);
    });
  });

  describe('Vendor Dashboard Endpoints', () => {
    it('Dashboard returns stats successfully', async () => {
      const res = await request(app).get('/api/v1/vendors/dashboard/stats').set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.stats).toBeDefined();
    });

    it('returns 401 unauthenticated if no token passed to dashboard', async () => {
      const res = await request(app).get('/api/v1/vendors/dashboard/stats');
      expect(res.status).toBe(401);
    });
  });
});
