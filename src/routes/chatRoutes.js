import express from 'express';
import { protect } from '../middleware/auth.js';
import * as chatController from '../controllers/chatController.js';

const router = express.Router();

router.use(protect);

router.get('/conversations', chatController.getConversations);
router.get('/:chatId/messages', chatController.getMessages);
router.post('/send', chatController.sendMessage);

export default router;
