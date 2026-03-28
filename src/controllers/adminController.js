import User from '../models/User.js';
import VendorProfile from '../models/VendorProfile.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';
import { successResponse } from '../utils/apiResponse.js';

export const getDashboardStats = catchAsync(async (req, res, next) => {
  const usersCount = await User.countDocuments();
  const vendorsCount = await VendorProfile.countDocuments();
  const productsCount = await Product.countDocuments();
  const ordersCount = await Order.countDocuments();

  const totalRevenueData = await Order.aggregate([
    { $match: { paymentStatus: 'paid' } },
    { $group: { _id: null, totalSales: { $sum: '$total' }, platformRevenue: { $sum: '$platformFee' } } }
  ]);

  const sales = totalRevenueData[0] ? totalRevenueData[0].totalSales : 0;
  const platformRevenue = totalRevenueData[0] ? totalRevenueData[0].platformRevenue : 0;

  successResponse(res, 200, 'Admin Dashboard Stats', {
    stats: {
      users: usersCount,
      vendors: vendorsCount,
      products: productsCount,
      orders: ordersCount,
      totalSales: sales,
      platformRevenue
    }
  });
});

export const getUsers = catchAsync(async (req, res, next) => {
  const { role, search, page = 1, limit = 20 } = req.query;
  const buildQuery = {};

  if (role) buildQuery.role = role;
  if (search) {
    buildQuery.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;

  const users = await User.find(buildQuery).skip(skip).limit(Number(limit)).sort({ createdAt: -1 });
  const total = await User.countDocuments(buildQuery);

  successResponse(res, 200, 'Users fetched', {
    users,
    pagination: { total, page: Number(page), pages: Math.ceil(total / limit) }
  });
});

export const toggleBanUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError('User not found', 404));

  if (user.role === 'admin') {
    return next(new AppError('Cannot ban an admin', 403));
  }

  user.isBanned = !user.isBanned;
  await user.save({ validateBeforeSave: false });

  successResponse(res, 200, `User has been ${user.isBanned ? 'banned' : 'unbanned'}`);
});

export const getVendors = catchAsync(async (req, res, next) => {
  const vendors = await VendorProfile.find().populate('userId', 'name email isBanned');
  successResponse(res, 200, 'Vendors fetched', { vendors });
});

export const toggleApproveVendor = catchAsync(async (req, res, next) => {
  const vendor = await VendorProfile.findById(req.params.id);
  if (!vendor) return next(new AppError('Vendor not found', 404));

  vendor.isApproved = !vendor.isApproved;
  await vendor.save();

  successResponse(res, 200, `Vendor has been ${vendor.isApproved ? 'approved' : 'rejected'}`, { vendor });
});

export const getProducts = catchAsync(async (req, res, next) => {
  const products = await Product.find().populate('vendor', 'shopName');
  successResponse(res, 200, 'Products fetched', { products });
});

export const toggleApproveProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new AppError('Product not found', 404));

  product.isApproved = !product.isApproved;
  await product.save();

  successResponse(res, 200, `Product has been ${product.isApproved ? 'approved' : 'unapproved'}`, { product });
});

export const getOrders = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const orders = await Order.find()
    .populate('customer', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Order.countDocuments();

  successResponse(res, 200, 'Orders fetched', {
    orders,
    pagination: { total, page, pages: Math.ceil(total / limit) }
  });
});

export const getRevenueAnalytics = catchAsync(async (req, res, next) => {
  // Aggregate revenue by month
  const revenueHistory = await Order.aggregate([
    { $match: { paymentStatus: 'paid' } },
    {
      $group: {
        _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
        totalSales: { $sum: '$total' },
        platformRevenue: { $sum: '$platformFee' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  successResponse(res, 200, 'Revenue analytics', { revenueHistory });
});

export const generateSitemap = catchAsync(async (req, res, next) => {
  // Simple XML generation
  const products = await Product.find({ isActive: true }).select('slug');
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  
  const baseUrl = process.env.CLIENT_URL || 'https://furnihub.com';
  
  xml += `<url><loc>${baseUrl}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>\n`;
  
  products.forEach(p => {
    xml += `<url><loc>${baseUrl}/products/${p.slug}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
  });
  
  xml += `</urlset>`;

  res.header('Content-Type', 'application/xml');
  res.send(xml);
});
