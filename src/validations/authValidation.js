import Joi from 'joi';

export const registerSchema = Joi.object({
  name: Joi.string().required().min(2).max(50),
  email: Joi.string().required().email(),
  password: Joi.string().required().min(8),
  role: Joi.string().valid('customer', 'vendor', 'admin').default('customer')
});

export const loginSchema = Joi.object({
  email: Joi.string().required().email(),
  password: Joi.string().required()
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().required().email()
});

export const resetPasswordSchema = Joi.object({
  password: Joi.string().required().min(8)
});
