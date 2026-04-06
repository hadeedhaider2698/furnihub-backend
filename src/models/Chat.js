import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  participants: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  lastMessage: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Message' 
  },
  unreadCount: { 
    type: Map, 
    of: Number, 
    default: {} 
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }
}, { timestamps: true });

const Chat = mongoose.model('Chat', chatSchema);
export default Chat;
