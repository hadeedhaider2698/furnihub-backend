import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import actual models
import User from './src/models/User.js';
import VendorProfile from './src/models/VendorProfile.js';
import Product from './src/models/Product.js';
import Order from './src/models/Order.js';
import Review from './src/models/Review.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected for Seeding');
  } catch (error) {
    console.error('❌ Connection error:', error);
    process.exit(1);
  }
};

const CATEGORIES = ['sofa', 'bed', 'dining-table', 'chair', 'wardrobe', 'desk', 'bookshelf', 'cabinet', 'outdoor', 'decor', 'other'];

const seedData = async () => {
  try {
    console.log('🗑️  Clearing existing collections...');
    await User.deleteMany({});
    await VendorProfile.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    await Review.deleteMany({});
    console.log('✅ Database cleared');

    const salt = await bcrypt.genSalt(10);
    const defaultPassword = await bcrypt.hash('Password123', salt);

    // 1. Create Admin
    const adminUser = await User.create({
      name: 'System Admin',
      email: 'admin@furnihub.com',
      password: defaultPassword,
      role: 'admin',
      isVerified: true
    });
    console.log('✅ Admin user created');

    // 2. Create 40 Customers
    const customers = [];
    for (let i = 1; i <= 40; i++) {
      customers.push({
        name: `Customer ${i}`,
        email: `customer${i}@test.com`,
        password: defaultPassword,
        role: 'customer',
        isVerified: true
      });
    }
    const createdCustomers = await User.insertMany(customers);
    console.log(`✅ 40 Customers created`);

    // 3. Create 40 Vendors & Vendor Profiles
    const vendors = [];
    for (let i = 1; i <= 40; i++) {
      vendors.push({
        name: `Vendor User ${i}`,
        email: `vendor${i}@test.com`,
        password: defaultPassword,
        role: 'vendor',
        isVerified: true
      });
    }
    const createdVendors = await User.insertMany(vendors);

    const vendorProfiles = createdVendors.map((v, index) => ({
      userId: v._id,
      shopName: `Elite Furniture ${index + 1}`,
      description: `Premium quality furniture crafted with care by Shop ${index + 1}.`,
      contactEmail: `contact@shop${index + 1}.com`,
      contactPhone: `+1234567890${index}`,
      address: {
        street: `${100 + index} Wood Lane`,
        city: 'Metropolis',
        state: 'Region',
        zipCode: '10001',
        country: 'USA'
      },
      isApproved: true,
      rating: (Math.random() * (5 - 3) + 3).toFixed(1),
      totalReviews: Math.floor(Math.random() * 50) + 1
    }));
    const createdVendorProfiles = await VendorProfile.insertMany(vendorProfiles);
    console.log(`✅ 40 Vendors and Profiles created`);

    // 4. Create 50 Products (at least 40+ required)
    const productsToCreate = [];
    for (let i = 1; i <= 50; i++) {
      // Pick random vendor
      const randomVendorProfile = createdVendorProfiles[Math.floor(Math.random() * createdVendorProfiles.length)];
      const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

      productsToCreate.push({
        vendor: randomVendorProfile._id,
        title: `Luxury ${category.replace('-', ' ')} ${i}`,
        slug: `luxury-${category}-${i}-${Math.random().toString(36).substr(2, 5)}`,
        sku: `SKU-${i}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        description: `This is an amazing ${category} that will elevate your living space perfectly. High quality material and modern design.`,
        shortDescription: `Beautiful ${category} for modern homes.`,
        category: category,
        price: Math.floor(Math.random() * 1000) + 50,
        stock: Math.floor(Math.random() * 100) + 5,
        isActive: true,
        isApproved: true,
        images: [
          { url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800', publicId: `prod_${i}_1`, isPrimary: true },
          { url: 'https://images.unsplash.com/photo-1540574163026-643ea20d25b5?w=800', publicId: `prod_${i}_2`, isPrimary: false }
        ],
        colors: [
          { name: 'Brown', hex: '#8B4513' },
          { name: 'White', hex: '#FFFFFF' }
        ],
        rating: (Math.random() * (5 - 3) + 3).toFixed(1),
        totalReviews: Math.floor(Math.random() * 20),
        totalSold: Math.floor(Math.random() * 100)
      });
    }
    const createdProducts = await Product.insertMany(productsToCreate);
    console.log(`✅ 50 Products created`);

    // 5. Create 40 Orders
    const ordersToCreate = [];
    for (let i = 1; i <= 40; i++) {
      const randomCustomer = createdCustomers[Math.floor(Math.random() * createdCustomers.length)];
      const p1 = createdProducts[Math.floor(Math.random() * createdProducts.length)];
      const p2 = createdProducts[Math.floor(Math.random() * createdProducts.length)];

      const subtotal = p1.price + p2.price;
      const deliveryCharge = 50;
      const total = subtotal + deliveryCharge;

      ordersToCreate.push({
        customer: randomCustomer._id,
        orderNumber: `ORD-${i}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        items: [
          {
            product: p1._id,
            vendor: p1.vendor,
            title: p1.title,
            image: p1.images[0].url,
            price: p1.price,
            quantity: 1,
            color: 'Brown',
            subtotal: p1.price
          },
          {
            product: p2._id,
            vendor: p2.vendor,
            title: p2.title,
            image: p2.images[0].url,
            price: p2.price,
            quantity: 1,
            color: 'White',
            subtotal: p2.price
          }
        ],
        shippingAddress: {
          fullName: randomCustomer.name,
          phone: '+1234567890',
          street: `${100 + i} Order St`,
          city: 'Order City',
          state: 'State',
          zipCode: '10001',
          country: 'USA'
        },
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        orderStatus: ['placed', 'processing', 'shipped', 'delivered'][Math.floor(Math.random() * 4)],
        subtotal,
        deliveryCharge,
        platformFee: subtotal * 0.05,
        total,
        statusHistory: [{ status: 'placed', note: 'Order placed by customer' }]
      });
    }
    const createdOrders = await Order.insertMany(ordersToCreate);
    console.log(`✅ 40 Orders created`);

    // 6. Create Reviews
    const reviewsToCreate = [];
    const reviewSet = new Set();
    for (let i = 0; i < 40; i++) {
      const randomOrder = createdOrders[i];
      const item = randomOrder.items[0];
      const key = `${randomOrder.customer}_${item.product}`;

      if (!reviewSet.has(key)) {
        reviewSet.add(key);
        reviewsToCreate.push({
          product: item.product,
          vendor: item.vendor,
          customer: randomOrder.customer,
          rating: Math.floor(Math.random() * (5 - 3 + 1)) + 3,
          title: 'Great purchase',
          comment: 'I really love this furniture piece. It fits perfectly in my room and the quality is outstanding.',
          isVerifiedPurchase: true,
          isApproved: true
        });
      }
    }
    await Review.insertMany(reviewsToCreate);
    console.log(`✅ 40 Reviews created`);

    console.log('🎉 SEEDING COMPLETE! 🎉');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

connectDB().then(seedData);
