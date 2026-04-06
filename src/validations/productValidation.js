import Joi from 'joi';

export const createProductSchema = Joi.object({
  title: Joi.string().required().trim(),
  description: Joi.string().required(),
  shortDescription: Joi.string().max(200).allow(''),
  category: Joi.string().valid('sofa','bed','dining-table','chair','wardrobe','desk','bookshelf','cabinet','outdoor','decor','other').required(),
  subcategory: Joi.string().allow(''),
  price: Joi.number().required().min(0),
  discountPrice: Joi.number().min(0).allow(null, ''),
  stock: Joi.number().required().min(0),
  sku: Joi.string().allow(''),
  images: Joi.array().items(Joi.object({
    url: Joi.string().uri().required(),
    publicId: Joi.string().required(),
    isPrimary: Joi.boolean().default(false)
  })).min(1).required(),
  dimensions: Joi.object({
    length: Joi.number(),
    width: Joi.number(),
    height: Joi.number(),
    unit: Joi.string().default('cm')
  }).optional(),
  weight: Joi.number(),
  material: Joi.string().allow(''),
  colors: Joi.array().items(Joi.object({
    name: Joi.string(),
    hex: Joi.string()
  })).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  deliveryInfo: Joi.object({
    freeDelivery: Joi.boolean(),
    deliveryCharge: Joi.number().min(0),
    estimatedDays: Joi.number().min(1)
  }).optional()
}).unknown(true);

export const updateProductSchema = createProductSchema.fork(Object.keys(createProductSchema.describe().keys), schema => schema.optional()).unknown(true);
