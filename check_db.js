import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './src/models/Product.js';

dotenv.config();

const checkIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const indexes = await Product.collection.getIndexes();
    console.log('Current Indexes:', JSON.stringify(indexes, null, 2));

    const products = await Product.find({}, 'title slug sku').lean();
    console.log('Existing Products (IDs/Slugs/SKUs):', products);

    // Try to drop the problematic SKU index if it's not sparse
    try {
        await Product.collection.dropIndex('sku_1');
        console.log('Dropped sku_1 index');
    } catch (e) {
        console.log('Could not drop sku_1 (maybe it doesn\'t exist or is already different)');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

checkIndexes();
