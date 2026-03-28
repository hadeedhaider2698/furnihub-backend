import express from 'express';
import * as adminController from '../controllers/adminController.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(protect, requireRole('admin'));

router.get('/dashboard', adminController.getDashboardStats);

router.get('/users', adminController.getUsers);
router.put('/users/:id/ban', adminController.toggleBanUser);

router.get('/vendors', adminController.getVendors);
router.put('/vendors/:id/approve', adminController.toggleApproveVendor);

router.get('/products', adminController.getProducts);
router.put('/products/:id/approve', adminController.toggleApproveProduct);

router.get('/orders', adminController.getOrders);

router.get('/revenue', adminController.getRevenueAnalytics);
router.get('/sitemap.xml', adminController.generateSitemap);

export default router;
