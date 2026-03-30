import express from 'express';
import * as vendorController from '../controllers/vendorController.js';
import { validate } from '../middleware/validate.js';
import { protect, requireRole } from '../middleware/auth.js';
import { registerVendorSchema, updateVendorProfileSchema } from '../validations/vendorValidation.js';

const router = express.Router();

router.get('/:id([0-9a-fA-F]{24})', vendorController.getVendorProfile);

// Protected routes
router.use(protect);
router.post('/register', validate(registerVendorSchema), vendorController.registerVendor);

// Vendor Only
router.use(requireRole('vendor'));
router.put('/profile', validate(updateVendorProfileSchema), vendorController.updateOwnProfile);
router.get('/dashboard/stats', vendorController.getDashboardStats);
router.get('/dashboard/products', vendorController.getOwnProducts);
router.get('/dashboard/orders', vendorController.getOwnOrders);
router.put('/dashboard/orders/:id', vendorController.updateOrderStatus);

export default router;
