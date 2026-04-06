import Notification from '../models/Notification.js';
import { emitToUser } from './socket.js';
import logger from './logger.js';

export const createNotification = async ({ recipient, sender, type, title, message, link }) => {
  try {
    const notification = await Notification.create({
      recipient,
      sender,
      type,
      title,
      message,
      link
    });

    // Real-time emit
    emitToUser(recipient, 'NOTIFICATION_RECEIVED', notification);

    return notification;
  } catch (error) {
    logger.error(`Error creating notification: ${error.message}`);
  }
};
