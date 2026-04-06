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

export const updateVendorProfileSchema = Joi.object({
  shopName: Joi.string().trim().min(2).max(100),
  description: Joi.string(),
  address: Joi.object({
    street: Joi.string().allow(''),
    city: Joi.string().allow(''),
    state: Joi.string().allow(''),
    country: Joi.string().allow(''),
    zipCode: Joi.string().allow('')
  }).optional(),
  contactEmail: Joi.string().email(),
  contactPhone: Joi.string().allow(''),
  shopLogo: Joi.string().uri().allow(''),
  shopBanner: Joi.string().uri().allow(''),
  socialLinks: Joi.object({
    website: Joi.string().uri().allow(''),
    instagram: Joi.string().allow(''),
    facebook: Joi.string().allow('')
  }).optional()
}).min(1).unknown(true);
