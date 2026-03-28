import express from 'express';
import * as cartController from '../controllers/cartController.js';
import { validate } from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import { addToCartSchema, updateCartItemSchema } from '../validations/cartValidation.js';

const router = express.Router();

router.use(protect);

router.get('/', cartController.getCart);
router.post('/add', validate(addToCartSchema), cartController.addToCart);
router.put('/update', validate(updateCartItemSchema), cartController.updateCartItem);
router.delete('/remove/:productId', cartController.removeCartItem);
router.delete('/clear', cartController.clearCart);

export default router;
