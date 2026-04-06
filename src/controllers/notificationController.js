import Notification from '../models/Notification.js';
import catchAsync from '../utils/catchAsync.js';
import { successResponse } from '../utils/apiResponse.js';

export const getNotifications = catchAsync(async (req, res, next) => {
  const notifications = await Notification.find({ recipient: req.user.id })
    .sort({ createdAt: -1 })
    .limit(20);

  successResponse(res, 200, 'Notifications fetched', { notifications });
});

export const markAsRead = catchAsync(async (req, res, next) => {
  await Notification.updateMany(
    { recipient: req.user.id, isRead: false },
    { isRead: true }
  );
  successResponse(res, 200, 'Notifications marked as read');
});

export const clearNotifications = catchAsync(async (req, res, next) => {
  await Notification.deleteMany({ recipient: req.user.id });
  successResponse(res, 200, 'Notifications cleared');
});
