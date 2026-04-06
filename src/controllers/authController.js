import crypto from 'crypto';
import User from '../models/User.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';
import { generateAccessToken, generateRefreshToken, createRandomToken } from '../utils/generateToken.js';
import { sendEmail, sendWelcomeEmail, sendPasswordResetEmail } from '../services/email.js';
import { successResponse } from '../utils/apiResponse.js';
import jwt from 'jsonwebtoken';

const sendTokenResponse = (user, statusCode, res, message) => {
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res.cookie('refreshToken', refreshToken, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    message,
    accessToken,
    data: { user }
  });
};

export const register = catchAsync(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  // Prevent arbitrary admin creation unless secret is provided (basic protection)
  if (role === 'admin' && req.headers['x-admin-secret'] !== process.env.ADMIN_REGISTRATION_SECRET) {
    return next(new AppError('Not authorized to create admin account', 403));
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    return next(new AppError('Email already in use', 400));
  }

  const { token: verificationToken, hashedToken } = createRandomToken();

  const user = await User.create({
    name,
    email,
    password,
    role: role || 'customer',
    emailVerificationToken: hashedToken
  });

  const verifyUrl = `${process.env.CLIENT_URL}/auth/verify-email/${verificationToken}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="color: #8b5a2b;">Verify Your Email</h2>
      <p>Hi ${name},</p>
      <p>Welcome to FurniHub! Please verify your email address to get started.</p>
      <p style="margin-top: 20px;">
        <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #8b5a2b; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">Verify Email Address</a>
      </p>
      <p style="margin-top: 20px; font-size: 12px; color: #777;">If you did not create an account, please ignore this email.</p>
    </div>
  `;

  try {
    await sendEmail({
      email: user.email,
      subject: 'FurniHub - Verify Your Email',
      html
    });
  } catch (err) {
    user.emailVerificationToken = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError('There was an error sending the email. Try again later!', 500));
  }

  sendTokenResponse(user, 201, res, 'Registration successful. Please verify your email.');
});

export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  
  if (!user || !(await user.comparePassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  if (user.isBanned) {
    return next(new AppError('This account has been banned.', 403));
  }

  user.lastLogin = Date.now();
  await user.save({ validateBeforeSave: false });

  sendTokenResponse(user, 200, res, 'Login successful');
});

export const logout = (req, res) => {
  res.cookie('refreshToken', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  successResponse(res, 200, 'Logged out successfully');
};

export const refreshToken = catchAsync(async (req, res, next) => {
  const token = req.cookies.refreshToken;
  if (!token) {
    return next(new AppError('No refresh token, please login again', 401));
  }

  const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
  const currentUser = await User.findById(decoded.id);

  if (!currentUser || currentUser.isBanned) {
    return next(new AppError('Token invalid or user banned', 401));
  }

  const accessToken = generateAccessToken(currentUser._id, currentUser.role);

  res.status(200).json({
    status: 'success',
    accessToken
  });
});

export const forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with email address.', 404));
  }

  const { token: resetToken, hashedToken } = createRandomToken();

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 mins
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL}/auth/reset-password/${resetToken}`;

  try {
    await sendPasswordResetEmail(user.email, user.name, resetUrl);
    successResponse(res, 200, 'Token sent to email!');
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError('There was an error sending the email. Try again later!', 500));
  }
});

export const resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  sendTokenResponse(user, 200, res, 'Password reset successful');
});

export const verifyEmail = catchAsync(async (req, res, next) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({ emailVerificationToken: hashedToken });

  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  user.isVerified = true;
  user.emailVerificationToken = undefined;
  await user.save({ validateBeforeSave: false });

  successResponse(res, 200, 'Email verified successfully');
});

export const getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  successResponse(res, 200, 'User profile fetched', { user });
});

export const updateMe = catchAsync(async (req, res, next) => {
  // 1) Prevent password updates through this route
  if (req.body.password) {
    return next(new AppError('This route is not for password updates. Use /reset-password or /update-password.', 400));
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = {};
  const allowedFields = ['name', 'email', 'avatar', 'bio', 'website', 'phone'];
  Object.keys(req.body).forEach(el => {
    if (allowedFields.includes(el)) filteredBody[el] = req.body[el];
  });

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });

  successResponse(res, 200, 'Profile updated successfully', { user: updatedUser });
});

export const toggleFollowVendor = catchAsync(async (req, res, next) => {
  const { vendorId } = req.params;
  const user = await User.findById(req.user.id);

  const index = user.following.indexOf(vendorId);
  let followed = false;

  if (index === -1) {
    user.following.push(vendorId);
    followed = true;
  } else {
    user.following.splice(index, 1);
    followed = false;
  }

  await user.save({ validateBeforeSave: false });

  successResponse(res, 200, followed ? 'Vendor followed' : 'Vendor unfollowed', { checked: followed });
});

export const getFollowing = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate({
    path: 'following',
    select: 'shopName shopLogo description rating address'
  });

  successResponse(res, 200, 'Following list fetched', { following: user.following });
});
