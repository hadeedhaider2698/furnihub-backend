import { v2 as cloudinary } from 'cloudinary';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';
import { successResponse } from '../utils/apiResponse.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadImage = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('No file uploaded', 400));
  }

  // Convert buffer to base64 data URI
  const fileStr = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

  const folder = req.body.folder || 'furnihub/general';
  const resourceType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';

  const uploadResult = await cloudinary.uploader.upload(fileStr, {
    folder,
    resource_type: resourceType,
    transformation: resourceType === 'image'
      ? [{ width: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' }]
      : [],
  });

  successResponse(res, 200, 'File uploaded successfully', {
    url: uploadResult.secure_url,
    publicId: uploadResult.public_id,
    resourceType: uploadResult.resource_type,
    width: uploadResult.width,
    height: uploadResult.height,
  });
});

export const deleteImage = catchAsync(async (req, res, next) => {
  const { publicId } = req.body;
  if (!publicId) return next(new AppError('publicId is required', 400));

  await cloudinary.uploader.destroy(publicId);
  successResponse(res, 200, 'File deleted successfully');
});
