import mongoose from "mongoose";

const TempSchema = new mongoose.Schema({
  tempId: {
    require: true,
    unique: true,
    type: String,
  },
  state: {
    require: true,
    type: Number,
  },
  deposit: {
    owner: {
      require: true,
      type: String,
      lowercase: true,
    },
    etherValue: {
      require: true,
      type: String,
    },
    nftTokens: [
      {
        nftAddress: {
          require: true,
          type: String,
          lowercase: true,
        },
        nftId: {
          require: true,
          type: String,
        },
        nftAmount: {
          require: true,
          type: String,
        },
        nftName: {
          require: true,
          type: String,
        },
        nftUri: {
          require: true,
          type: String,
        },
      },
    ],
  },
});

const Temp = mongoose.model("temps", TempSchema);

export default Temp;
