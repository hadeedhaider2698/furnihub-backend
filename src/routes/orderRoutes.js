import express from 'express';
import * as orderController from '../controllers/orderController.js';
import { validate } from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import { createOrderSchema } from '../validations/orderValidation.js';

const router = express.Router();

router.use(protect);

router.post('/', validate(createOrderSchema), orderController.createOrder);
router.get('/', orderController.getMyOrders);
router.get('/:id', orderController.getOrderById);
router.put('/:id/cancel', orderController.cancelOrder);

router.post('/payment/intent', orderController.createPaymentIntent);

export default router;
