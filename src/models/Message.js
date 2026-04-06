import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  chat: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Chat', 
    required: true 
  },
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  content: { 
    type: String, 
    required: true,
    trim: true
  },
  isRead: { 
    type: Boolean, 
    default: false 
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);
export default Message;
