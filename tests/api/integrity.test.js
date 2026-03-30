import request from 'supertest';
import app from '../../src/app.js';
import User from '../../src/models/User.js';
import VendorProfile from '../../src/models/VendorProfile.js';
import Product from '../../src/models/Product.js';

describe('Data Integrity API', () => {
  let cToken;

  beforeAll(async () => {
    await request(app).post('/api/v1/auth/register').send({ name: 'Int Cust', email: 'ic@c.com', password: 'Password123' });
    cToken = (await request(app).post('/api/v1/auth/login').send({ email: 'ic@c.com', password: 'Password123' })).body.accessToken;
    
    await request(app).post('/api/v1/auth/register').send({ name: 'Int Vend', email: 'iv@v.com', password: 'Password123' });
    const vendor = await User.findOneAndUpdate({ email: 'iv@v.com' }, { role: 'vendor' }, { new: true });
    
    // Seed vendor and items explicitly bypassing routes to force exact mathematical state
    const vp = await VendorProfile.create({ userId: vendor._id, shopName: 'Int Shop', isApproved: true });
    await Product.create({ vendor: vp._id, title: 'Item 1', slug: 'i1', description: 'desc', price: 1000, stock: 100, category: 'sofa' });
  });

  describe('Mathematical Accuracies', () => {
    it('calculates order mathematical integers perfectly', async () => {
      const p1 = await Product.findOne({ slug: 'i1' });

      const requestBody = {
        items: [
          { product: p1._id, quantity: 3, color: 'N/A' } // 3 * 1000 = 3000
        ],
        shippingAddress: { fullName: 'A', phone: '1', street: '1', city: '1', state: '1', zipCode: '1', country: '1' },
        paymentMethod: 'cod'
      };

      const res = await request(app).post('/api/v1/orders').set('Authorization', `Bearer ${cToken}`).send(requestBody);
      
      expect(res.status).toBe(201);
      const order = res.body.data.order;
      
      // Integrity checks
      expect(order.subtotal).toBe(3000);
      expect(order.platformFee).toBe(3000 * 0.025); // 2.5% fee -> 75
      expect(order.total).toBe(order.subtotal + (order.deliveryCharge || 0)); 
    });
  });
});
