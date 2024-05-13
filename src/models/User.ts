import mongoose, { Document, Model } from "mongoose";

// Define the interface for the user document
interface User extends Document {
  username: string;
  walletAddress: string;
  email?: string;
  avatar?: string;
  nonce: string;
  isActive: boolean;
  banExpires: string;
  role: number;
  mute: boolean;
  ban: boolean;
  verify_code: string;
  temp_email: string;
  notifications: {
    marketing: boolean;
    alert: boolean;
    alertDetails: {
      createdNewRisk: boolean;
      offerReceived: boolean;
      completedRisk: boolean;
      createdNewOffer: boolean;
      offerReturned: boolean;
      expiredListing: boolean;
    };
  };
  date: Date;
}

// Define the user schema
const UserSchema = new mongoose.Schema<User>({
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
  banExpires: {
    type: String,
    default: "0",
  },
  role: {
    type: Number,
    default: 0 // 0: user, 1: admin, 2: moderator
  },
  mute: {
    type: Boolean,
    default: false // 0: common, 1: mute, 2: ban
  },
  ban: {
    type: Boolean,
    default: false
  },
  verify_code: {
    type: String,
    default: ''
  },
  temp_email: {
    type: String,
    default: ''
  },
  notifications: {
    marketing: {
      type: Boolean,
      default: true,
    },
    alert: {
      type: Boolean,
      default: true,
    },
    alertDetails: {
      createdNewRisk: {
        type: Boolean,
        default: true,
      },
      offerReceived: {
        type: Boolean,
        default: true,
      },
      completedRisk: {
        type: Boolean,
        default: true,
      },
      createdNewOffer: {
        type: Boolean,
        default: true,
      },
      offerReturned: {
        type: Boolean,
        default: true,
      },
      expiredListing: {
        type: Boolean,
        default: true,
      },
    },
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

// Define the user model
const UserModal: Model<User> = mongoose.model<User>("user", UserSchema);

export default UserModal;