import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  content: { type: String, required: true },
  time: { type: Date, default: Date.now() },
  read: {
    type: Boolean,
    default: false,
  },
});

const NotificationModel = mongoose.model("notifications", NotificationSchema);

export default NotificationModel;
