import mongoose from "mongoose";

const ChatSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  message: { type: String, required: true },
  created: { type: Date, default: Date.now() },
});

const ChatModel = mongoose.model("chat", ChatSchema);

export default ChatModel;
