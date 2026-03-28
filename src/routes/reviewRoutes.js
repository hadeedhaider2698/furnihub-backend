import express from 'express';
import * as reviewController from '../controllers/reviewController.js';
import { validate } from '../middleware/validate.js';
import { protect, requireRole } from '../middleware/auth.js';
import { reviewSchema } from '../validations/reviewValidation.js';

const router = express.Router();

router.get('/product/:id', reviewController.getProductReviews);

router.use(protect);
router.post('/', validate(reviewSchema), reviewController.addReview);
router.put('/:id', reviewController.updateReview);
router.delete('/:id', reviewController.deleteReview);

export default router;
