import mongoose from 'mongoose';
import slugify from 'slugify';

const productSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorProfile', required: true },
  title: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, sparse: true },
  description: { type: String, required: true },
  shortDescription: { type: String, maxLength: 200 },
  category: { 
    type: String, 
    enum: ['sofa','bed','dining-table','chair','wardrobe','desk','bookshelf','cabinet','outdoor','decor','other'], 
    required: true 
  },
  subcategory: { type: String },
  images: [{
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    isPrimary: { type: Boolean, default: false }
  }],
  price: { type: Number, required: true },
  discountPrice: { type: Number },
  currency: { type: String, default: 'USD' },
  stock: { type: Number, required: true, default: 0 },
  sku: { type: String, unique: true, sparse: true },
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: { type: String, default: 'cm' }
  },
  weight: { type: Number },
  material: { type: String },
  colors: [{
    name: String,
    hex: String
  }],
  tags: [String],
  rating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  totalSold: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  isApproved: { type: Boolean, default: false },
  deliveryInfo: {
    freeDelivery: { type: Boolean, default: false },
    deliveryCharge: { type: Number, default: 0 },
    estimatedDays: { type: Number, default: 7 }
  }
}, { timestamps: true });

// Indexes specified in prompt
productSchema.index({ title: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ vendor: 1 });
// Removed redundant slug index

productSchema.pre('save', function(next) {
  if (this.isModified('title') && (!this.slug || this.slug.trim() === '')) {
    const baseSlug = slugify(this.title, { lower: true, strict: true }) || 'product';
    this.slug = baseSlug + '-' + Math.random().toString(36).substr(2, 6);
  }
  next();
});

const Product = mongoose.model('Product', productSchema);
export default Product;
