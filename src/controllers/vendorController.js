import VendorProfile from '../models/VendorProfile.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';
import { successResponse } from '../utils/apiResponse.js';
import { createNotification } from '../utils/notification.js';

export const registerVendor = catchAsync(async (req, res, next) => {
  const existingVendor = await VendorProfile.findOne({ userId: req.user.id });
  if (existingVendor) {
    return next(new AppError('You are already registered as a vendor', 400));
  }

  const vendor = await VendorProfile.create({
    userId: req.user.id,
    ...req.body,
    contactEmail: req.body.contactEmail || req.user.email,
    isApproved: true // Auto-approve for demo/dev purposes
  });

  await User.findByIdAndUpdate(req.user.id, { role: 'vendor' });

  successResponse(res, 201, 'Vendor application submitted successfully', { vendor });
});

export const getVendorProfile = catchAsync(async (req, res, next) => {
  const vendor = await VendorProfile.findById(req.params.id);
  if (!vendor) return next(new AppError('Vendor not found', 404));

  // Count how many users are following this vendor
  const followersCount = await User.countDocuments({ following: vendor._id });

  const vendorObj = vendor.toObject();
  vendorObj.followersCount = followersCount;

  successResponse(res, 200, 'Vendor profile', { vendor: vendorObj });
});

export const getVendorByUserId = catchAsync(async (req, res, next) => {
  const vendor = await VendorProfile.findOne({ userId: req.params.userId });
  if (!vendor) return next(new AppError('Vendor not found', 404));

  successResponse(res, 200, 'Vendor profile', { vendor });
});

export const getVendors = catchAsync(async (req, res, next) => {
  // Fetch all approved vendors, latest first
  const vendors = await VendorProfile.find({ isApproved: true })
    .select('shopName shopLogo description rating totalSales address createdAt')
    .sort({ createdAt: -1 })
    .limit(30);

  // If user is logged in, prioritize followed shops
  if (req.user && req.user.following && req.user.following.length > 0) {
    const followingIds = req.user.following.map(id => id.toString());
    
    vendors.sort((a, b) => {
      const aFollowed = followingIds.includes(a._id.toString());
      const bFollowed = followingIds.includes(b._id.toString());
      
      if (aFollowed && !bFollowed) return -1;
      if (!aFollowed && bFollowed) return 1;
      return 0; // Maintain relative chronological order
    });
  }
    
  successResponse(res, 200, 'Vendors retrieved successfully', { vendors: vendors.slice(0, 20) });
});

export const updateOwnProfile = catchAsync(async (req, res, next) => {
  const vendor = await VendorProfile.findOneAndUpdate(
    { userId: req.user.id },
    { 
      $set: { 
        ...req.body,
        userId: req.user.id,
        isApproved: true // Ensure approved on update/upsert
      } 
    },
    { new: true, runValidators: true, upsert: true }
  );

  successResponse(res, 200, 'Profile updated successfully', { vendor });
});

export const getDashboardStats = catchAsync(async (req, res, next) => {
  // Use findOneAndUpdate with upsert to self-heal missing profiles for vendor-role users
  const vendor = await VendorProfile.findOneAndUpdate(
    { userId: req.user.id },
    { 
      $setOnInsert: { 
        userId: req.user.id,
        shopName: `${req.user.name || 'New'}'s Shop`,
        description: 'Welcome to my new shop!',
        isApproved: true // Auto-approve on self-heal
      } 
    },
    { new: true, upsert: true }
  );

  // 1. Total Products count
  const totalProducts = await Product.countDocuments({ vendor: vendor._id });
  
  // 2. Low Stock Count
  const lowStockCount = await Product.countDocuments({ vendor: vendor._id, stock: { $lt: 5 } });

  // 3. Revenue & Order Count
  const orders = await Order.find({ 'items.vendor': vendor._id });
  
  let totalRevenue = 0;
  let totalOrders = orders.length;
  let totalUnitsSold = 0;

  orders.forEach(order => {
    (order.items || []).forEach(item => {
      if (item?.vendor?.toString() === vendor._id.toString()) {
        totalRevenue += item.subtotal || 0;
        totalUnitsSold += item.quantity || 0;
      }
    });
  });

  // 4. Recent Orders (last 5)
  const recentOrders = await Order.find({ 'items.vendor': vendor._id })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('customer', 'name email');

  // Filter recent orders to only show relevant vendor items and calculate vendor subtotal
  const filteredRecentOrders = recentOrders.map(order => {
    const orderObj = order.toObject();
    orderObj.items = (orderObj.items || []).filter(item => item?.vendor?.toString() === vendor._id.toString());
    orderObj.vendorSubtotal = orderObj.items.reduce((acc, item) => acc + (item.subtotal || 0), 0);
    return orderObj;
  });

  successResponse(res, 200, 'Dashboard stats', {
    stats: {
      totalProducts,
      totalOrders,
      totalRevenue,
      totalUnitsSold,
      lowStockCount,
      rating: vendor.rating || 0
    },
    recentOrders: filteredRecentOrders,
    vendor
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

  // Notify customer
  createNotification({
    recipient: order.customer,
    sender: req.user.id,
    type: 'order',
    title: 'Order Status Updated',
    message: `Your order #${order.orderNumber} is now ${status}.`,
    link: `/orders`
  });

  successResponse(res, 200, 'Order status updated', { order });
});
