import mongoose from 'mongoose';

const vendorProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  shopName: { type: String, required: true, trim: true },
  shopLogo: { type: String },
  shopBanner: { type: String },
  description: { type: String },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  contactEmail: { type: String },
  contactPhone: { type: String },
  socialLinks: {
    website: String,
    instagram: String,
    facebook: String
  },
  rating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 },
  isApproved: { type: Boolean, default: false },
  subscriptionPlan: { type: String, enum: ['free', 'basic', 'pro'], default: 'free' },
  subscriptionExpiry: { type: Date },
  stripeAccountId: { type: String },
  bankDetails: {
    accountHolder: String,
    accountNumber: String,
    bankName: String
  }
}, { timestamps: true });

const VendorProfile = mongoose.model('VendorProfile', vendorProfileSchema);
export default VendorProfile;
