import Joi from 'joi';

export const reviewSchema = Joi.object({
  product: Joi.string().required(),
  rating: Joi.number().min(1).max(5).required(),
  title: Joi.string(),
  comment: Joi.string(),
  images: Joi.array().items(Joi.string())
});
