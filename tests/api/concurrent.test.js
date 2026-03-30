import request from 'supertest';
import app from '../../src/app.js';
import User from '../../src/models/User.js';
import Product from '../../src/models/Product.js';
import VendorProfile from '../../src/models/VendorProfile.js';

describe('Concurrency Tests', () => {
  let cust1Token, cust2Token, dummyProductId, vendorProfileId;

  beforeAll(async () => {
    // Generate Actors
    await request(app).post('/api/v1/auth/register').send({ name: 'Cust1', email: 'cc1@c.com', password: 'Password123' });
    await request(app).post('/api/v1/auth/register').send({ name: 'Cust2', email: 'cc2@c.com', password: 'Password123' });
    await request(app).post('/api/v1/auth/register').send({ name: 'Vend1', email: 'vv1@v.com', password: 'Password123' });

    const vendor = await User.findOneAndUpdate({ email: 'vv1@v.com' }, { role: 'vendor' }, { new: true });
    cust1Token = (await request(app).post('/api/v1/auth/login').send({ email: 'cc1@c.com', password: 'Password123' })).body.accessToken;
    cust2Token = (await request(app).post('/api/v1/auth/login').send({ email: 'cc2@c.com', password: 'Password123' })).body.accessToken;

    const vendorProfile = await VendorProfile.create({ userId: vendor._id, shopName: 'Concurrency Test', isApproved: true });
    vendorProfileId = vendorProfile._id;

    // Create a product with ONLY 1 item left in stock
    const product = await Product.create({
      vendor: vendorProfileId,
      title: 'Last Sofa',
      slug: 'last-sofa',
      description: 'Very limited stock description',
      price: 10000,
      stock: 1,
      category: 'sofa'
    });
    dummyProductId = product._id;
  });

  describe('Parallel Order Processing', () => {
    it('prevents overselling when two customers buy the last item simultaneously', async () => {
      // Simulate two customers trying to check out exactly at the same millisecond
      const orderData1 = {
        items: [{ product: dummyProductId, quantity: 1, color: 'Red' }],
        shippingAddress: { fullName: 'T1', phone: '1', street: '1', city: '1', state: '1', zipCode: '1', country: '1' },
        paymentMethod: 'cod'
      };
      const orderData2 = {
        items: [{ product: dummyProductId, quantity: 1, color: 'Red' }],
        shippingAddress: { fullName: 'T2', phone: '2', street: '2', city: '2', state: '2', zipCode: '2', country: '2' },
        paymentMethod: 'cod'
      };

      // Promise.all ensures both requests hit the server nearly identically
      const [res1, res2] = await Promise.all([
        request(app).post('/api/v1/orders').set('Authorization', `Bearer ${cust1Token}`).send(orderData1),
        request(app).post('/api/v1/orders').set('Authorization', `Bearer ${cust2Token}`).send(orderData2)
      ]);

      // Exactly ONE request should succeed (201), the other MUST fail (400 insufficient stock)
      const statuses = [res1.status, res2.status];
      expect(statuses).toContain(201);
      expect(statuses).toContain(400);

      // Final stock check, should be exactly 0, not -1
      const finalProduct = await Product.findById(dummyProductId);
      expect(finalProduct.stock).toBe(0);
    });
  });
});
