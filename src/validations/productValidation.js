import Joi from 'joi';

export const createProductSchema = Joi.object({
  title: Joi.string().required().trim(),
  description: Joi.string().required(),
  shortDescription: Joi.string().max(200),
  category: Joi.string().valid('sofa','bed','dining-table','chair','wardrobe','desk','bookshelf','cabinet','outdoor','decor','other').required(),
  subcategory: Joi.string(),
  price: Joi.number().required().min(0),
  discountPrice: Joi.number().min(0),
  stock: Joi.number().required().min(0),
  sku: Joi.string(),
  dimensions: Joi.object({
    length: Joi.number(),
    width: Joi.number(),
    height: Joi.number(),
    unit: Joi.string()
  }),
  weight: Joi.number(),
  material: Joi.string(),
  colors: Joi.array().items(Joi.object({
    name: Joi.string(),
    hex: Joi.string()
  })),
  tags: Joi.array().items(Joi.string()),
  deliveryInfo: Joi.object({
    freeDelivery: Joi.boolean(),
    deliveryCharge: Joi.number().min(0),
    estimatedDays: Joi.number().min(1)
  })
});

export const updateProductSchema = createProductSchema.fork(Object.keys(createProductSchema.describe().keys), schema => schema.optional());
