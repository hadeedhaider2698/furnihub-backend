import Joi from 'joi';

export const registerVendorSchema = Joi.object({
  shopName: Joi.string().required().trim().min(2).max(100),
  description: Joi.string().required(),
  address: Joi.object({
    street: Joi.string(),
    city: Joi.string(),
    state: Joi.string(),
    country: Joi.string(),
    zipCode: Joi.string()
  }).required(),
  contactEmail: Joi.string().email().required(),
  contactPhone: Joi.string().required()
});

export const updateVendorProfileSchema = registerVendorSchema.fork(Object.keys(registerVendorSchema.describe().keys), schema => schema.optional());
