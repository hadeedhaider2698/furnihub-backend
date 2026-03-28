import Joi from 'joi';

export const createOrderSchema = Joi.object({
  items: Joi.array().items(
    Joi.object({
      product: Joi.string().required(),
      quantity: Joi.number().min(1).required(),
      color: Joi.string()
    })
  ).min(1).required(),
  shippingAddress: Joi.object({
    fullName: Joi.string().required(),
    phone: Joi.string().required(),
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    country: Joi.string().required(),
    zipCode: Joi.string().required()
  }).required(),
  paymentMethod: Joi.string().valid('stripe', 'cod').required(),
  notes: Joi.string().optional().allow('')
});
