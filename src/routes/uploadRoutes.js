import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/auth.js';
import { uploadImage, deleteImage } from '../controllers/uploadController.js';

const router = express.Router();

// Store in memory buffer (no disk, directly stream to Cloudinary)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and videos are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// All upload routes require authentication
router.use(protect);

router.post('/image', upload.single('file'), uploadImage);
router.delete('/image', deleteImage);

export default router;
