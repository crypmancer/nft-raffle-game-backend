import mongoose from "mongoose";

const CollectionSchema = new mongoose.Schema({
  address: { required: true, unique: true, type: String, lowercase: true },
  name: { required: true, type: String },
  logo: { type: String },
  banner: { type: String },
  totalSupply: { type: Number },
  price: {
    type: Number,
    default: 0,
  },
  approved: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    default: "ERC721",
  },
  info: {
    twitter: {
      type: String,
    },
    discord: {
      type: String,
    },
    opensea: {
      type: String,
    },
    comment: {
      type: String,
    },
    contact: {
      type: String,
    },
  },
  chainId: {
    type: String,
    required: true,
  },
  tokens: [
    {
      nftId: {
        type: String,
        require: true,
      },
      nftAmount: {
        type: String,
        default: "0",
      },
      nftUri: {
        type: String,
        default: "",
      },
      nftName: {
        type: String,
        default: "",
      },
      owner: {
        type: String,
        require: true,
      },
    },
  ],
  date: {
    type: Date,
    default: Date.now(),
  },
});

const Collection = mongoose.model("collections", CollectionSchema);

export default Collection;
