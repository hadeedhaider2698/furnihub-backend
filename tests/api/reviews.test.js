import request from 'supertest';
import app from '../../src/app.js';
import Product from '../../src/models/Product.js';
import User from '../../src/models/User.js';
import Order from '../../src/models/Order.js';

describe('Reviews API', () => {
  let customerToken;
  let dummyProductId;
  let dummyOrderId;
  let reviewId;

  beforeAll(async () => {
    await request(app).post('/api/v1/auth/register').send({ name: 'Rev Cust', email: 'rev@test.com', password: 'Password123' });
    customerToken = (await request(app).post('/api/v1/auth/login').send({ email: 'rev@test.com', password: 'Password123' })).body.accessToken;

    const user = await User.findOne({ email: 'rev@test.com' });

    const product = await Product.create({
      title: 'Review Sofa',
      slug: 'review-sofa',
      description: 'Another sofa',
      price: 500,
      stock: 10,
      category: 'sofa'
    });
    dummyProductId = product._id;

    const order = await Order.create({
      orderNumber: 'FH-TEST-REV-001',
      customer: user._id,
      items: [{ product: dummyProductId, quantity: 1, price: 500, subtotal: 500 }],
      subtotal: 500,
      total: 500,
      paymentStatus: 'paid',
      orderStatus: 'delivered', // Crucial: must be delivered to review!
      shippingAddress: { fullName: 'A', phone: '1', street: '1', city: '1', state: '1', zipCode: '1', country: '1' }
    });
    dummyOrderId = order._id;
  });

  describe('POST /api/v1/reviews', () => {
    it('customer with delivered order leaves review returning 201', async () => {
      const reviewData = {
        product: dummyProductId,
        rating: 5,
        title: 'Great product',
        comment: 'I really like this sofa.'
      };

      const res = await request(app).post('/api/v1/reviews').set('Authorization', `Bearer ${customerToken}`).send(reviewData);
      expect(res.status).toBe(201);
      reviewId = res.body.data.review._id;

      const pInfo = await Product.findById(dummyProductId);
      expect(pInfo.totalReviews).toBe(1);
      expect(pInfo.rating).toBe(5);
    });

    it('duplicate review on same product fails with 409', async () => {
      const reviewData = { product: dummyProductId, rating: 4 };
      const res = await request(app).post('/api/v1/reviews').set('Authorization', `Bearer ${customerToken}`).send(reviewData);
      expect(res.status).toBe(409); // Conflict
    });

    it('rating above 5 returns 400', async () => {
      const res = await request(app).post('/api/v1/reviews').set('Authorization', `Bearer ${customerToken}`).send({
        product: 'any_id', rating: 6
      });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/reviews/product/:id', () => {
    it('returns paginated reviews for product', async () => {
      const res = await request(app).get(`/api/v1/reviews/product/${dummyProductId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.reviews.length).toBe(1);
    });
  });

  describe('DELETE /api/v1/reviews/:id', () => {
    it('customer deletes own review', async () => {
      const res = await request(app).delete(`/api/v1/reviews/${reviewId}`).set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(200);

      const pInfo = await Product.findById(dummyProductId);
      expect(pInfo.totalReviews).toBe(0);
    });
  });
});
