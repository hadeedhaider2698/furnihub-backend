import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';
import { successResponse } from '../utils/apiResponse.js';

export const getCart = catchAsync(async (req, res, next) => {
  let cart = await Cart.findOne({ user: req.user.id }).populate('items.product', 'title price discountPrice images vendor stock slug category');
  
  if (!cart) {
    cart = await Cart.create({ user: req.user.id, items: [] });
  }

  successResponse(res, 200, 'User cart', { cart });
});

export const addToCart = catchAsync(async (req, res, next) => {
  const { productId, quantity = 1, color } = req.body;

  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    return next(new AppError('Product not found or unavailable', 404));
  }

  let cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    cart = await Cart.create({ user: req.user.id, items: [] });
  }

  const existingItemIndex = cart.items.findIndex(
    item => item.product.toString() === productId && item.color === color
  );

  if (existingItemIndex > -1) {
    cart.items[existingItemIndex].quantity += quantity;
  } else {
    cart.items.push({ product: productId, quantity, color });
  }

  await cart.save();
  await cart.populate('items.product', 'title price discountPrice images vendor stock slug category');

  successResponse(res, 200, 'Added to cart', { cart });
});

export const updateCartItem = catchAsync(async (req, res, next) => {
  const { productId, quantity, color } = req.body;

  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) return next(new AppError('Cart not found', 404));

  const itemIndex = cart.items.findIndex(
    item => item.product.toString() === productId && item.color === color
  );

  if (itemIndex > -1) {
    cart.items[itemIndex].quantity = quantity;
    await cart.save();
    await cart.populate('items.product', 'title price discountPrice images vendor stock slug category');
    successResponse(res, 200, 'Cart updated', { cart });
  } else {
    return next(new AppError('Item not found in cart', 404));
  }
});

export const removeCartItem = catchAsync(async (req, res, next) => {
  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) return next(new AppError('Cart not found', 404));

  cart.items = cart.items.filter(item => item.product.toString() !== req.params.productId);
  await cart.save();
  await cart.populate('items.product', 'title price discountPrice images vendor stock slug category');

  successResponse(res, 200, 'Item removed from cart', { cart });
});

export const clearCart = catchAsync(async (req, res, next) => {
  const cart = await Cart.findOneAndUpdate(
    { user: req.user.id },
    { items: [] },
    { new: true }
  );

  successResponse(res, 200, 'Cart cleared', { cart });
});
