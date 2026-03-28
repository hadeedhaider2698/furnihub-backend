import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorProfile', required: true },
    title: String,
    image: String,
    price: Number,
    quantity: { type: Number, required: true, min: 1 },
    color: String,
    subtotal: Number
  }],
  shippingAddress: {
    fullName: String,
    phone: String,
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  paymentMethod: { type: String, enum: ['stripe', 'cod'], required: true },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  stripePaymentIntentId: { type: String },
  orderStatus: { type: String, enum: ['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'], default: 'placed' },
  subtotal: { type: Number, required: true },
  deliveryCharge: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  platformFee: { type: Number, default: 0 },
  total: { type: Number, required: true },
  notes: { type: String },
  trackingNumber: { type: String },
  statusHistory: [{
    status: { type: String },
    timestamp: { type: Date, default: Date.now },
    note: { type: String }
  }]
}, { timestamps: true });

orderSchema.pre('save', function(next) {
  if (!this.orderNumber) {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    this.orderNumber = `FH-${new Date().getFullYear()}-${randomNum}`;
  }
  next();
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
