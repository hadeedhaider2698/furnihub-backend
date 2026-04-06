import express from 'express';
import * as productController from '../controllers/productController.js';
import { validate } from '../middleware/validate.js';
import { protect, requireRole } from '../middleware/auth.js';
import { uploadProductImages } from '../middleware/upload.js';
import { createProductSchema, updateProductSchema } from '../validations/productValidation.js';

const router = express.Router();

router.get('/', productController.getProducts);
router.get('/categories', productController.getCategories);
router.get('/search', productController.searchProducts);
router.get('/id/:id', productController.getProductById); // New route for editing
router.get('/:slug', productController.getProductBySlug);

// Vendor Protected Routes
router.use(protect, requireRole('vendor'));

router.post('/', validate(createProductSchema), productController.createProduct);
router.put('/:id', validate(updateProductSchema), productController.updateProduct);
router.patch('/:id/toggle-status', productController.toggleStatus);
router.delete('/:id', productController.deleteProduct);

router.post('/:id/images', uploadProductImages, productController.uploadImages);
router.delete('/:id/images/:imageId', productController.deleteImage);

export default router;
