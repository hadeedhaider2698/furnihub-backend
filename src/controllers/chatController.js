import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import catchAsync from '../utils/catchAsync.js';
import { successResponse } from '../utils/apiResponse.js';
import AppError from '../utils/appError.js';
import { emitToUser } from '../utils/socket.js';
import VendorProfile from '../models/VendorProfile.js';

export const getConversations = catchAsync(async (req, res, next) => {
  const conversations = await Chat.find({
    participants: req.user.id
  })
  .populate('participants', 'name email avatar role')
  .populate('lastMessage')
  .sort({ updatedAt: -1 });

  // Enrich vendors with shopName
  const enrichedConversations = await Promise.all(conversations.map(async (conv) => {
    const chat = conv.toObject({ flattenMaps: true });
    if (!chat.participants) return chat;
    chat.participants = await Promise.all(chat.participants.map(async (p) => {
      if (!p) return null;
      if (p.role === 'vendor') {
        const profile = await VendorProfile.findOne({ userId: p._id }).select('shopName shopLogo');
        return { ...p, shopName: profile?.shopName, shopLogo: profile?.shopLogo };
      }
      return p;
    }));
    chat.participants = chat.participants.filter(p => p !== null);
    return chat;
  }));

  successResponse(res, 200, 'Conversations fetched', { conversations: enrichedConversations });
});

export const getMessages = catchAsync(async (req, res, next) => {
  const { chatId } = req.params;
  const messages = await Message.find({ chat: chatId })
    .populate('sender', 'name avatar')
    .sort({ createdAt: 1 });

  // Mark all messages in this chat as read for this user
  await Message.updateMany(
    { chat: chatId, sender: { $ne: req.user.id }, isRead: false },
    { isRead: true }
  );

  // Reset unread count for this user in this chat
  await Chat.findByIdAndUpdate(chatId, {
    $set: { [`unreadCount.${req.user.id}`]: 0 }
  });

  successResponse(res, 200, 'Messages fetched', { messages });
});

export const sendMessage = catchAsync(async (req, res, next) => {
  const { receiverId, content, productId } = req.body;
  let { chatId } = req.body;

  if (!chatId) {
    // Find existing 1-on-1 chat
    let chat = await Chat.findOne({
      participants: { $all: [req.user.id, receiverId], $size: 2 }
    });

    if (chat) {
      // Update product context if a new one is provided
      if (productId && (!chat.product || chat.product.toString() !== productId.toString())) {
        chat.product = productId;
        await chat.save();
      }
    } else {
      // Create new chat
      chat = await Chat.create({
        participants: [req.user.id, receiverId],
        product: productId
      });
    }
    chatId = chat._id;
  }

  const messageData = {
    chat: chatId,
    sender: req.user.id,
    content
  };

  if (productId) {
    messageData.product = productId;
  }

  const message = await Message.create(messageData);

  await Chat.findByIdAndUpdate(chatId, {
    lastMessage: message._id,
    $inc: { [`unreadCount.${receiverId}`]: 1 }
  });

  const populatedMessage = await message.populate('sender', 'name avatar');

  // Emit to receiver
  emitToUser(receiverId, 'MESSAGE_RECEIVED', { chatId, message: populatedMessage });

  successResponse(res, 201, 'Message sent', { message: populatedMessage, chatId });
});
