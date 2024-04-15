import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
  },
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  email: {
    type: String,
  },
  avatar: {
    type: String,
  },
  nonce: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Unix ms timestamp when the ban will end, 0 = no ban
  banExpires: {
    type: String,
    default: "0",
  },
  notifications: {
    marketing: {
      type: Boolean,
      default: false,
    },
    alert: {
      type: Boolean,
      default: false,
    },
    alertDetails: {
      createdNewRisk: {
        type: Boolean,
        default: false,
      },
      offerReceived: {
        type: Boolean,
        default: false,
      },
      completedRisk: {
        type: Boolean,
        default: false,
      },
      createdNewOffer: {
        type: Boolean,
        default: false,
      },
      offerReturned: {
        type: Boolean,
        default: false,
      },
      expiredListing: {
        type: Boolean,
        default: false,
      },
    },
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model("users", UserSchema);

export default User;
