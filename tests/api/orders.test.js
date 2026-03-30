import request from 'supertest';
import app from '../../src/app.js';
import User from '../../src/models/User.js';
import Product from '../../src/models/Product.js';
import VendorProfile from '../../src/models/VendorProfile.js';
import Order from '../../src/models/Order.js';

describe('Orders API', () => {
  let customerToken;
  let vendorToken;
  let adminToken;
  let dummyProduct;
  let dummyOrder;

  beforeAll(async () => {
    // Generate Actors
    await request(app).post('/api/v1/auth/register').send({ name: 'Cust', email: 'co@c.com', password: 'Password123' });
    await request(app).post('/api/v1/auth/register').send({ name: 'Vend', email: 'vo@v.com', password: 'Password123' });
    await request(app).post('/api/v1/auth/register').send({ name: 'Adm', email: 'ao@a.com', password: 'Password123' });

    const vendor = await User.findOneAndUpdate({ email: 'vo@v.com' }, { role: 'vendor' }, { new: true });
    await User.findOneAndUpdate({ email: 'ao@a.com' }, { role: 'admin' });

    customerToken = (await request(app).post('/api/v1/auth/login').send({ email: 'co@c.com', password: 'Password123' })).body.accessToken;
    vendorToken = (await request(app).post('/api/v1/auth/login').send({ email: 'vo@v.com', password: 'Password123' })).body.accessToken;
    adminToken = (await request(app).post('/api/v1/auth/login').send({ email: 'ao@a.com', password: 'Password123' })).body.accessToken;

    const vendorProfile = await VendorProfile.create({ userId: vendor._id, shopName: 'Order Test Shop', isApproved: true });

    dummyProduct = await Product.create({
      vendor: vendorProfile._id,
      title: 'Order Sofa',
      slug: 'order-sofa',
      description: 'Order sofa description',
      price: 10000,
      stock: 10,
      category: 'sofa'
    });
  });

  describe('POST /api/v1/orders', () => {
    it('customer places order creating 201 and stock decremented', async () => {
      const orderData = {
        items: [{ product: dummyProduct._id, quantity: 2, color: 'Red' }],
        shippingAddress: { fullName: 'Test', phone: '123', street: '12', city: 'Karachi', state: 'Sindh', zipCode: '75000', country: 'PK' },
        paymentMethod: 'cod'
      };

      const res = await request(app).post('/api/v1/orders').set('Authorization', `Bearer ${customerToken}`).send(orderData);
      expect(res.status).toBe(201);
      
      const productCheck = await Product.findById(dummyProduct._id);
      expect(productCheck.stock).toBe(8); // 10 initial - 2 ordered
      dummyOrder = res.body.data.order;
    });

    it('denies order if product out of stock (400)', async () => {
      const orderData = {
        items: [{ product: dummyProduct._id, quantity: 20 }], // only 8 left
        shippingAddress: { fullName: 'Test', phone: '123', street: '12', city: 'Karachi', state: 'Sindh', zipCode: '75000', country: 'PK' },
        paymentMethod: 'cod'
      };
      
      const res = await request(app).post('/api/v1/orders').set('Authorization', `Bearer ${customerToken}`).send(orderData);
      expect(res.status).toBe(400);
    });

    it('denies order if unauthenticated (401)', async () => {
      const res = await request(app).post('/api/v1/orders').send({});
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/orders', () => {
    it('customer sees only their orders', async () => {
      const res = await request(app).get('/api/v1/orders').set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.orders.length).toBeGreaterThanOrEqual(1);
    });

    it('customer can view own order detail', async () => {
      const res = await request(app).get(`/api/v1/orders/${dummyOrder._id}`).set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.order._id).toBe(dummyOrder._id.toString());
    });
  });

  describe('PUT /api/v1/orders/:id/cancel', () => {
    it('customer cancels placed order restoring stock', async () => {
      const res = await request(app).put(`/api/v1/orders/${dummyOrder._id}/cancel`).set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(200);

      const productCheck = await Product.findById(dummyProduct._id);
      expect(productCheck.stock).toBe(10); // restored back to 10
    });
  });

  describe('Vendor & Admin View', () => {
    it('admin sees all orders', async () => {
      const res = await request(app).get('/api/v1/admin/orders').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.orders)).toBe(true);
    });
  });
});
