import Joi from 'joi';

export const addToCartSchema = Joi.object({
  productId: Joi.string().required(),
  quantity: Joi.number().min(1).default(1),
  color: Joi.string()
});

export const updateCartItemSchema = Joi.object({
  productId: Joi.string().required(),
  quantity: Joi.number().min(1).required(),
  color: Joi.string()
});
