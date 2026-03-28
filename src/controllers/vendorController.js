import VendorProfile from '../models/VendorProfile.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';
import { successResponse } from '../utils/apiResponse.js';

export const registerVendor = catchAsync(async (req, res, next) => {
  const existingVendor = await VendorProfile.findOne({ userId: req.user.id });
  if (existingVendor) {
    return next(new AppError('You are already registered as a vendor', 400));
  }

  const vendor = await VendorProfile.create({
    userId: req.user.id,
    ...req.body,
    contactEmail: req.body.contactEmail || req.user.email
  });

  await User.findByIdAndUpdate(req.user.id, { role: 'vendor' });

  successResponse(res, 201, 'Vendor application submitted successfully', { vendor });
});

export const getVendorProfile = catchAsync(async (req, res, next) => {
  const vendor = await VendorProfile.findById(req.params.id);
  if (!vendor) return next(new AppError('Vendor not found', 404));

  successResponse(res, 200, 'Vendor profile', { vendor });
});

export const updateOwnProfile = catchAsync(async (req, res, next) => {
  const vendor = await VendorProfile.findOneAndUpdate(
    { userId: req.user.id },
    req.body,
    { new: true, runValidators: true }
  );

  if (!vendor) return next(new AppError('Vendor profile not found', 404));

  successResponse(res, 200, 'Profile updated successfully', { vendor });
});

export const getDashboardStats = catchAsync(async (req, res, next) => {
  const vendor = await VendorProfile.findOne({ userId: req.user.id });
  if (!vendor) return next(new AppError('Vendor profile not found', 404));

  const totalProducts = await Product.countDocuments({ vendor: vendor._id });
  
  const orders = await Order.find({ 'items.vendor': vendor._id });
  
  let totalRevenue = 0;
  let totalOrders = orders.length;

  orders.forEach(order => {
    order.items.forEach(item => {
      if (item.vendor.toString() === vendor._id.toString()) {
        totalRevenue += item.subtotal;
      }
    });
  });

  successResponse(res, 200, 'Dashboard stats', {
    stats: {
      totalProducts,
      totalOrders,
      totalRevenue,
      rating: vendor.rating
    }
  });
});

export const getOwnProducts = catchAsync(async (req, res, next) => {
  const vendor = await VendorProfile.findOne({ userId: req.user.id });
  if (!vendor) return next(new AppError('Vendor profile not found', 404));

  const products = await Product.find({ vendor: vendor._id }).sort({ createdAt: -1 });
  
  successResponse(res, 200, 'Vendor products', { products });
});

export const getOwnOrders = catchAsync(async (req, res, next) => {
  const vendor = await VendorProfile.findOne({ userId: req.user.id });
  if (!vendor) return next(new AppError('Vendor profile not found', 404));

  // Find orders where at least one item belongs to this vendor
  const orders = await Order.find({ 'items.vendor': vendor._id })
    .sort({ createdAt: -1 })
    .populate('customer', 'name email');

  // Filter items in each order to only show the vendor's own items
  const vendorOrders = orders.map(order => {
    const orderObj = order.toObject();
    orderObj.items = orderObj.items.filter(item => item.vendor.toString() === vendor._id.toString());
    
    // Recalculate vendor-specific subtotal
    orderObj.vendorSubtotal = orderObj.items.reduce((acc, item) => acc + item.subtotal, 0);
    return orderObj;
  });

  successResponse(res, 200, 'Vendor orders', { orders: vendorOrders });
});

export const updateOrderStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body; // e.g., 'processing', 'shipped'
  
  const vendor = await VendorProfile.findOne({ userId: req.user.id });
  if (!vendor) return next(new AppError('Vendor profile not found', 404));

  const order = await Order.findOne({ _id: req.params.id, 'items.vendor': vendor._id });
  if (!order) return next(new AppError('Order not found or not yours', 404));

  // In a real multi-vendor app, status handling is complex. Here we simplify.
  order.orderStatus = status;
  order.statusHistory.push({
    status,
    note: `Updated by vendor ${vendor.shopName}`
  });

  await order.save();

  successResponse(res, 200, 'Order status updated', { order });
});
