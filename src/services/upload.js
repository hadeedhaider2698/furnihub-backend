import sharp from 'sharp';
import cloudinary from '../config/cloudinary.js';
import AppError from '../utils/appError.js';

export const uploadToCloudinary = async (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `furnihub/${folder}`,
        format: 'webp',
      },
      (error, result) => {
        if (error) return reject(new AppError('Image upload failed', 500));
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );

    // Resize and convert to WebP, stripping EXIF data
    sharp(fileBuffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer()
      .then(buffer => {
        uploadStream.end(buffer);
      })
      .catch(err => {
        reject(new AppError('Image processing failed', 500));
      });
  });
};

export const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    throw new AppError('Failed to delete image', 500);
  }
};
