import Product from '../models/Product.js';
import VendorProfile from '../models/VendorProfile.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';
import { successResponse } from '../utils/apiResponse.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../services/upload.js';

export const getProducts = catchAsync(async (req, res, next) => {
  const { category, minPrice, maxPrice, rating, vendor, inStock, color, sort, cursor, limit = 20 } = req.query;

  let query = { isActive: true, isApproved: true };

  if (category) query.category = category;
  if (vendor) query.vendor = vendor;
  if (inStock === 'true') query.stock = { $gt: 0 };
  if (color) query['colors.name'] = new RegExp(color, 'i');
  
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  if (rating) query.rating = { $gte: Number(rating) };

  // Cursor-based pagination (assuming _id as cursor)
  if (cursor) {
    query._id = { $gt: cursor };
  }

  let sortOption = { createdAt: -1 };
  if (sort === 'price_asc') sortOption = { price: 1 };
  if (sort === 'price_desc') sortOption = { price: -1 };
  if (sort === 'rating') sortOption = { rating: -1 };
  if (sort === 'bestselling') sortOption = { totalSold: -1 };

  const products = await Product.find(query)
    .sort(sortOption)
    .limit(Number(limit))
    .populate('vendor', 'shopName shopLogo rating')
    .select('title slug price discountPrice images vendor rating totalReviews createdAt')
    .lean();

  const nextCursor = products.length === limit ? products[products.length - 1]._id : null;

  res.status(200).json({
    status: 'success',
    results: products.length,
    data: {
      products,
      nextCursor
    }
  });
});

export const searchProducts = catchAsync(async (req, res, next) => {
  const { q } = req.query;
  if (!q) return next(new AppError('Search query is required', 400));

  const products = await Product.find({
    $text: { $search: q },
    isActive: true,
    isApproved: true
  }).populate('vendor', 'shopName shopLogo');

  successResponse(res, 200, 'Search results', { products });
});

export const getProductBySlug = catchAsync(async (req, res, next) => {
  const product = await Product.findOne({ slug: req.params.slug })
    .populate('vendor', 'userId shopName shopLogo description rating totalReviews');

  if (!product) return next(new AppError('No product found with that slug', 404));

successResponse(res, 200, 'Product retrieved successfully', { product });
});

export const getProductById = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id)
    .populate('vendor', 'userId shopName shopLogo description rating totalReviews');

  if (!product) return next(new AppError('No product found with that ID', 404));

  successResponse(res, 200, 'Product retrieved successfully', { product });
});

export const createProduct = catchAsync(async (req, res, next) => {
  const vendor = await VendorProfile.findOne({ userId: req.user.id });
  if (!vendor) return next(new AppError('You must be registered as a vendor to create products', 403));
  if (!vendor.isApproved) return next(new AppError('Your vendor account is pending approval', 403));

  const newProduct = await Product.create({
    ...req.body,
    vendor: vendor._id,
    isApproved: true // Auto-approve for demo purposes as requested
  });

  successResponse(res, 201, 'Product created successfully', { product: newProduct });
});

export const updateProduct = catchAsync(async (req, res, next) => {
  const vendor = await VendorProfile.findOne({ userId: req.user.id });
  if (!vendor) return next(new AppError('Unauthorized access', 403));

  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, vendor: vendor._id },
    req.body,
    { new: true, runValidators: true }
  );

  if (!product) return next(new AppError('Product not found or unauthorized', 404));

  successResponse(res, 200, 'Product updated successfully', { product });
});

export const deleteProduct = catchAsync(async (req, res, next) => {
  const vendor = await VendorProfile.findOne({ userId: req.user.id });
  if (!vendor) return next(new AppError('Unauthorized access', 403));

  const product = await Product.findOneAndDelete({ _id: req.params.id, vendor: vendor._id });

  if (!product) return next(new AppError('Product not found or unauthorized', 404));

  // Also delete images from Cloudinary
  for (const img of product.images) {
    await deleteFromCloudinary(img.publicId);
  }

  successResponse(res, 204, 'Product deleted');
});

export const toggleStatus = catchAsync(async (req, res, next) => {
  const vendor = await VendorProfile.findOne({ userId: req.user.id });
  if (!vendor) return next(new AppError('Unauthorized access', 403));

  const product = await Product.findOne({ _id: req.params.id, vendor: vendor._id });
  if (!product) return next(new AppError('Product not found', 404));

  product.isActive = !product.isActive;
  await product.save();

  successResponse(res, 200, 'Product status updated', { isActive: product.isActive });
});

export const uploadImages = catchAsync(async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next(new AppError('Please upload at least one image', 400));
  }

  const vendor = await VendorProfile.findOne({ userId: req.user.id });
  if (!vendor) return next(new AppError('Unauthorized access', 403));

  const product = await Product.findOne({ _id: req.params.id, vendor: vendor._id });
  if (!product) return next(new AppError('Product not found', 404));

  const maxImagesAllowed = 8;
  if (product.images.length + req.files.length > maxImagesAllowed) {
    return next(new AppError(`You can only upload up to ${maxImagesAllowed} images in total`, 400));
  }

  const uploadedImages = [];

  for (const file of req.files) {
    const result = await uploadToCloudinary(file.buffer, 'products');
    uploadedImages.push({
      url: result.url,
      publicId: result.publicId,
      isPrimary: product.images.length === 0 && uploadedImages.length === 0
    });
  }

  product.images.push(...uploadedImages);
  await product.save();

  successResponse(res, 200, 'Images uploaded successfully', { images: product.images });
});

export const deleteImage = catchAsync(async (req, res, next) => {
  const vendor = await VendorProfile.findOne({ userId: req.user.id });
  if (!vendor) return next(new AppError('Unauthorized access', 403));

  const product = await Product.findOne({ _id: req.params.id, vendor: vendor._id });
  if (!product) return next(new AppError('Product not found', 404));

  const imageIndex = product.images.findIndex(img => img.publicId === req.params.imageId);
  if (imageIndex === -1) return next(new AppError('Image not found in this product', 404));

  await deleteFromCloudinary(req.params.imageId);

  // If was primary, assign primary to first remaining image if exists
  const wasPrimary = product.images[imageIndex].isPrimary;
  product.images.splice(imageIndex, 1);
  
  if (wasPrimary && product.images.length > 0) {
    product.images[0].isPrimary = true;
  }

  await product.save();

  successResponse(res, 200, 'Image deleted successfully', { images: product.images });
});

export const getCategories = catchAsync(async (req, res, next) => {
  const categories = await Product.distinct('category', { isActive: true, isApproved: true });
  successResponse(res, 200, 'Categories retrieved successfully', { categories });
});
