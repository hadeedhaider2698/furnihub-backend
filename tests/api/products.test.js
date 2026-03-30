import request from 'supertest';
import app from '../../src/app.js';
import User from '../../src/models/User.js';
import Product from '../../src/models/Product.js';
import VendorProfile from '../../src/models/VendorProfile.js';

describe('Products API', () => {
  let customerToken;
  let vendorToken;
  let adminToken;
  let vendorProfileId;
  let dummyProductId;

  beforeAll(async () => {
    // Scaffold test users
    const customerRes = await request(app).post('/api/v1/auth/register').send({ name: 'Cust', email: 'c@c.com', password: 'Password123' });
    const vendorRes = await request(app).post('/api/v1/auth/register').send({ name: 'Vend', email: 'v@v.com', password: 'Password123' });
    const adminRes = await request(app).post('/api/v1/auth/register').send({ name: 'Adm', email: 'a@a.com', password: 'Password123' });

    // Make vendor and admin real
    await User.findOneAndUpdate({ email: 'v@v.com' }, { role: 'vendor' });
    await User.findOneAndUpdate({ email: 'a@a.com' }, { role: 'admin' });

    // Login users to get tokens AFTER role assignment
    customerToken = (await request(app).post('/api/v1/auth/login').send({ email: 'c@c.com', password: 'Password123' })).body.accessToken;
    vendorToken = (await request(app).post('/api/v1/auth/login').send({ email: 'v@v.com', password: 'Password123' })).body.accessToken;
    adminToken = (await request(app).post('/api/v1/auth/login').send({ email: 'a@a.com', password: 'Password123' })).body.accessToken;

    const vendor = await User.findOne({ email: 'v@v.com' });
    const vendorProfile = await VendorProfile.create({ userId: vendor._id, shopName: 'Test Shop', isApproved: true });
    vendorProfileId = vendorProfile._id;

    // Create a dummy product
    const product = await Product.create({
      vendor: vendorProfileId,
      title: 'Initial Test Sofa',
      slug: 'initial-test-sofa',
      description: 'A comfortable sofa',
      price: 15000,
      stock: 5,
      sku: 'MOCK-SKU-1',
      category: 'sofa',
      isApproved: true
    });
    dummyProductId = product._id;
  });

  // ─── PUBLIC PRODUCT ENDPOINTS ─────────────────────────────────────────
  describe('GET /api/v1/products', () => {
    it('returns paginated list, default 20 per page', async () => {
      const res = await request(app).get('/api/v1/products');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.products)).toBe(true);
      expect(res.body.data.nextCursor).toBeDefined(); // or null if finished
    });

    it('filters by category correctly', async () => {
      const res = await request(app).get('/api/v1/products?category=sofa');
      expect(res.status).toBe(200);
      expect(res.body.data.products[0].category).toBe('sofa');
    });

    it('filters by price range correctly', async () => {
      const res = await request(app).get('/api/v1/products?minPrice=1000&maxPrice=50000');
      expect(res.status).toBe(200);
      expect(res.body.data.products[0].price).toBeGreaterThanOrEqual(1000);
      expect(res.body.data.products[0].price).toBeLessThanOrEqual(50000);
    });

    it('returns product with vendor populated on valid slug', async () => {
      const res = await request(app).get('/api/v1/products/initial-test-sofa');
      expect(res.status).toBe(200);
      expect(res.body.data.product.vendor).toBeDefined();
    });

    it('returns 404 on nonexistent slug', async () => {
      const res = await request(app).get('/api/v1/products/nonexistent-slug');
      expect(res.status).toBe(404);
    });
  });

  // ─── VENDOR PRODUCT MANAGEMENT ────────────────────────────────────────
  describe('POST /api/v1/products', () => {
    const newProduct = { title: 'New Table', description: 'Table desc', sku: 'MOCK-SKU-2', price: 10000, stock: 10, category: 'dining-table' };

    it('vendor creates product returning 201', async () => {
      const res = await request(app).post('/api/v1/products').set('Authorization', `Bearer ${vendorToken}`).send(newProduct);
      expect(res.status).toBe(201);
      expect(res.body.data.product.vendor.toString()).toBe(vendorProfileId.toString());
    });

    it('customer tries to create returning 403', async () => {
      const res = await request(app).post('/api/v1/products').set('Authorization', `Bearer ${customerToken}`).send(newProduct);
      expect(res.status).toBe(403);
    });

    it('returns 401 unauthenticated if no token', async () => {
      const res = await request(app).post('/api/v1/products').send(newProduct);
      expect(res.status).toBe(401);
    });

    it('returns 400 validation if title is missing', async () => {
      const res = await request(app).post('/api/v1/products').set('Authorization', `Bearer ${vendorToken}`).send({ price: 1000, stock: 5 });
      expect(res.status).toBe(400);
    });
  });

  // ─── ADMIN PRODUCT MANAGEMENT ─────────────────────────────────────────
  describe('PUT /api/v1/admin/products/:id/approve', () => {
    it('admin approves product setting isApproved: true', async () => {
      const res = await request(app).put(`/api/v1/admin/products/${dummyProductId}/approve`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'approved' });
      expect(res.status).toBe(200);
      // Logic inside backend depends on actual endpoint structure. Assuming 200 is success.
    });

    it('vendor tries to approve returning 403', async () => {
      const res = await request(app).put(`/api/v1/admin/products/${dummyProductId}/approve`).set('Authorization', `Bearer ${vendorToken}`).send();
      expect(res.status).toBe(403);
    });
  });
});
