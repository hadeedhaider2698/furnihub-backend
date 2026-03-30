import request from 'supertest';
import app from '../../src/app.js';
import User from '../../src/models/User.js';
import Product from '../../src/models/Product.js';
import Cart from '../../src/models/Cart.js';

describe('Cart API', () => {
  let userToken;
  let dummyProductId;

  beforeAll(async () => {
    // Generate an authenticated user context
    await request(app).post('/api/v1/auth/register').send({ name: 'Cart Tester', email: 'cart@test.com', password: 'Password123' });
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'cart@test.com', password: 'Password123' });
    userToken = login.body.accessToken;

    // Scaffold Vendor for product creation
    await request(app).post('/api/v1/auth/register').send({ name: 'Cart Vendor', email: 'vcart@test.com', password: 'Password123' });
    await User.findOneAndUpdate({ email: 'vcart@test.com' }, { role: 'vendor' });
    const vendorUser = await User.findOne({ email: 'vcart@test.com' });
    const vp = await import('../../src/models/VendorProfile.js').then(m => m.default.create({ userId: vendorUser._id, shopName: 'Cart Shop', isApproved: true }));

    // Seed dummy product
    const product = await Product.create({
      vendor: vp._id,
      title: 'Cart Product',
      slug: 'cart-product',
      sku: 'CART-SKU',
      description: 'Cart desc',
      price: 1500,
      stock: 10,
      category: 'sofa',
      isApproved: true
    });
    dummyProductId = product._id;
  });

  describe('GET /api/v1/cart', () => {
    it('returns empty items array without error for empty cart', async () => {
      const res = await request(app).get('/api/v1/cart').set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.cart.items).toEqual([]);
    });
  });

  describe('POST /api/v1/cart/add', () => {
    it('adds item to cart successfully', async () => {
      const res = await request(app)
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ productId: dummyProductId, quantity: 1 });
        
      expect(res.status).toBe(200);
      expect(res.body.data.cart.items.length).toBe(1);
      expect(res.body.data.cart.items[0].product._id.toString()).toBe(dummyProductId.toString());
    });

    it('adding same product again increments quantity', async () => {
      const res = await request(app)
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ productId: dummyProductId, quantity: 2 });
        
      expect(res.status).toBe(200);
      expect(res.body.data.cart.items[0].quantity).toBe(3); // 1 previous + 2 new
    });

    it('fails with 401 if unauthenticated', async () => {
      const res = await request(app).post('/api/v1/cart/add').send({ productId: dummyProductId, quantity: 1 });
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/v1/cart/update', () => {
    it('updates quantity correctly', async () => {
      const res = await request(app)
        .put('/api/v1/cart/update')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ productId: dummyProductId, quantity: 5 });
        
      expect(res.status).toBe(200);
      expect(res.body.data.cart.items[0].quantity).toBe(5);
    });

    it('removes item from cart using DELETE endpoint', async () => {
      const res = await request(app)
        .delete(`/api/v1/cart/remove/${dummyProductId}`)
        .set('Authorization', `Bearer ${userToken}`);
        
      expect(res.status).toBe(200);
      expect(res.body.data.cart.items.length).toBe(0);
    });
  });

  describe('DELETE /api/v1/cart/clear', () => {
    it('empties entire cart', async () => {
      await request(app).post('/api/v1/cart/add').set('Authorization', `Bearer ${userToken}`).send({ productId: dummyProductId, quantity: 2 });
      
      const res = await request(app).delete('/api/v1/cart/clear').set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.cart.items.length).toBe(0);
    });
  });
});
