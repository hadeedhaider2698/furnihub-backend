import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './src/models/Product.js';

dotenv.config();

const cleanIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const collection = mongoose.connection.collection('products');
    
    try {
        await collection.dropIndex('sku_1');
        console.log('Dropped sku_1');
    } catch (e) {}

    try {
        await collection.dropIndex('slug_1');
        console.log('Dropped slug_1');
    } catch (e) {}

    console.log('Indexes cleared. Mongoose will recreate them based on updated schema.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

cleanIndexes();
