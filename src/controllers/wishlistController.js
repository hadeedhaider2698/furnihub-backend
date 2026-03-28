import Wishlist from '../models/Wishlist.js';
import catchAsync from '../utils/catchAsync.js';
import { successResponse } from '../utils/apiResponse.js';

export const getWishlist = catchAsync(async (req, res, next) => {
  let wishlist = await Wishlist.findOne({ user: req.user.id }).populate('products', 'title price discountPrice images slug');
  
  if (!wishlist) {
    wishlist = await Wishlist.create({ user: req.user.id, products: [] });
  }

  successResponse(res, 200, 'User wishlist', { wishlist });
});

export const toggleWishlist = catchAsync(async (req, res, next) => {
  const { productId } = req.body;

  let wishlist = await Wishlist.findOne({ user: req.user.id });
  if (!wishlist) {
    wishlist = await Wishlist.create({ user: req.user.id, products: [] });
  }

  const index = wishlist.products.findIndex(id => id.toString() === productId);
  
  let message;
  if (index > -1) {
    wishlist.products.splice(index, 1);
    message = 'Removed from wishlist';
  } else {
    wishlist.products.push(productId);
    message = 'Added to wishlist';
  }

  await wishlist.save();
  await wishlist.populate('products', 'title price discountPrice images slug');

  successResponse(res, 200, message, { wishlist });
});
