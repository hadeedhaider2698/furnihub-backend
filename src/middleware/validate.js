import AppError from '../utils/appError.js';

export const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map(detail => detail.message).join(', ');
    return next(new AppError(errorMessages, 400));
  }
  next();
};
