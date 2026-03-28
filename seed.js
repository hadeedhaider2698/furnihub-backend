import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import VendorProfile from './src/models/VendorProfile.js';
import Product from './src/models/Product.js';

dotenv.config();

const dummyAdmin = {
  name: 'Admin User',
  email: 'admin@furnihub.com',
  password: 'password123',
  role: 'admin',
  isEmailVerified: true
};

const dummyVendorUser = {
  name: 'Vendor User',
  email: 'vendor@furnihub.com',
  password: 'password123',
  role: 'vendor',
  isEmailVerified: true
};

const dummyCustomer = {
  name: 'Customer User',
  email: 'customer@furnihub.com',
  password: 'password123',
  role: 'customer',
  isEmailVerified: true
};

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
  } catch (err) {
    console.error('Error connecting to DB:', err);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing
    await User.deleteMany();
    await VendorProfile.deleteMany();
    await Product.deleteMany();

    console.log('Cleared existing data');

    // Create Users
    const admin = await User.create(dummyAdmin);
    const vendorUser = await User.create(dummyVendorUser);
    const customer = await User.create(dummyCustomer);

    console.log('Users created:');
    console.log(`Admin: ${admin.email} / password123`);
    console.log(`Vendor: ${vendorUser.email} / password123`);
    console.log(`Customer: ${customer.email} / password123`);

    // Create Vendor Profile
    const vendorProfile = await VendorProfile.create({
      userId: vendorUser._id,
      shopName: 'Luxury Home Co.',
      description: 'Premium curated furniture for modern living spaces.',
      isApproved: true,
      contactEmail: 'contact@luxuryhome.com',
      contactPhone: '+1234567890'
    });

    console.log('Vendor profile created');

    // Create Products
    const products = [
      {
        vendor: vendorUser._id,
        title: 'Minimalist Velvet Sofa',
        description: 'A beautiful minimalist velvet sofa perfect for modern living rooms. This exquisite piece marries uncompromising comfort with sleek, contemporary lines.',
        price: 1299,
        discountPrice: 999,
        category: 'sofa',
        stock: 10,
        sku: 'SOFA-001',
        images: [{ url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80', publicId: 'sofa1' }],
        isActive: true,
        isApproved: true
      },
      {
        vendor: vendorUser._id,
        title: 'Oak Wood Dining Table',
        description: 'Handcrafted solid oak wood dining table for 6 people. Brings a warm, organic touch to your dining room setup.',
        price: 899,
        category: 'dining-table',
        stock: 5,
        sku: 'TABLE-001',
        images: [{ url: 'https://images.unsplash.com/photo-1617806118233-18e1c0945594?w=800&q=80', publicId: 'table1' }],
        isActive: true,
        isApproved: true
      },
      {
        vendor: vendorUser._id,
        title: 'Platform King Bed',
        description: 'Low profile platform bed frame in natural walnut finish. Experience restful slumbers in absolute style.',
        price: 1499,
        discountPrice: 1350,
        category: 'bed',
        stock: 15,
        sku: 'BED-001',
        images: [{ url: 'https://images.unsplash.com/photo-1505693314120-0d443867891c?w=800&q=80', publicId: 'bed1' }],
        isActive: true,
        isApproved: true
      },
      {
        vendor: vendorUser._id,
        title: 'Ergonomic Lounge Chair',
        description: 'Accent lounge chair with ergonomic support and premium leather. Designed for ultimate relaxation.',
        price: 599,
        category: 'chair',
        stock: 8,
        sku: 'CHAIR-001',
        images: [{ url: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800&q=80', publicId: 'chair1' }],
        isActive: true,
        isApproved: true
      }
    ];

    for (const prod of products) {
      try {
        await Product.create(prod);
      } catch (e) {
        console.error(`Failed to create product ${prod.title}:`, e.message);
      }
    }
    console.log('Products creation finished');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
};

seedData();
