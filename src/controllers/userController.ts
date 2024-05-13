import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

import { verifySignature, verifyWallet } from "./tokenController";
import { generateRandomNonce } from "../lib/generator";

import User from "../models/User";
import { AuthRequest, IPayloadUserJwt } from "../interfaces";
import { JWT_EXPIRE_TIME, JWT_PRIVATE_KEY } from "../config";
import { sendEmail } from "./mailer";
import UserModal from "../models/User";

export const loadUser = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user?.isActive)
      return res.status(403).send({ error: "Unallowd user" });
    return res.json({
      id: req.user.id,
      walletAddress: user.walletAddress,
      avatar: user?.avatar,
      username: user.username,
      email: user?.email,
      notifications: user?.notifications,
      role: user?.role,
    });
  } catch (err: any) {
    console.log(err.toString());
    return res.status(500).send({ error: err });
  }
};

export const signUp = async (req: Request, res: Response) => {
  const { walletAddress } = req.body;
  if (!walletAddress)
    return res.status(400).json({ err: "Wallet address not provided" });

  const isValid = verifyWallet(walletAddress);
  if (!isValid)
    return res.status(400).json({ err: "Provided wallet address is invalid" });

  const nonce = generateRandomNonce();

  await User.findOneAndUpdate(
    { walletAddress },
    { nonce, username: walletAddress },
    {
      upsert: true,
    }
  );

  return res.json(nonce);
};

export const signIn = async (req: Request, res: Response) => {
  const { walletAddress, signature } = req.body;
  if (!walletAddress)
    return res.status(400).json({ err: "Wallet address not provided" });
  if (!signature)
    return res.status(400).json({ err: "Signature not provided" });

  const user = await User.findOne({ walletAddress });
  if (!user)
    return res.status(400).json({ err: "Provided walletAddress is invalid" });

  const { verified, err } = await verifySignature(
    user.walletAddress,
    user.nonce,
    signature
  );
  if (err) return res.status(427).json({ err });
  if (!verified)
    return res.status(427).json({ err: "Provided signature is invalid" });

  const token = await createAccessToken({
    user: {
      id: user.id,
    },
  });
  return res.json({ token });
};

export const createAccessToken = async (payload: IPayloadUserJwt) => {
  return jwt.sign(payload, JWT_PRIVATE_KEY, { expiresIn: "12h" });
};

export const unsubscribe = async (req: Request, res: Response) => {
  const { email } = req.params;
  console.log('unsubscribe function', email)
  const user = await UserModal.findOne({email: email});
  if(!user) return res.send("This email does not registerd!");
  await UserModal.findOneAndUpdate({
    email: email
  }, {
    'notifications.alert': false,
    'notifications.alertDetails.createdNewRisk' : false,
    'notifications.alertDetails.offerReceived' : false,
    'notifications.alertDetails.completedRisk' : false,
    'notifications.alertDetails.createdNewOffer' : false,
    'notifications.alertDetails.offerReturned' : false,
    'notifications.alertDetails.expiredListing' : false
  })
  res.send("Succesfully unsubscribed")
}

export const updateUsername = async (req: AuthRequest, res: Response) => {
  const { id } = req.user;
  const { username } = req.body;
  if (!username) return res.status(400).json({ err: "Username not provided" });

  const user = await User.findOne({ username });
  if (user)
    return res.status(427).json({ err: "Provided username is already exist" });

  const newUser = await User.findByIdAndUpdate(
    id,
    { username },
    { new: true, upsert: true }
  );

  return res.json(newUser);
};

export const updateEmail = async (req: AuthRequest, res: Response) => {
  const { id } = req.user;
  const { email } = req.body;
  if (!email) return res.status(400).json({ err: "Email not provided" });

  const user = await User.findOne({ email });
  const currentUser = await User.findById(id);
  if (!currentUser)
    return res.status(427).json({ err: "This user is not exist!" });
  if (user)
    return res.status(427).json({ err: "Provided email is already exist" });

  try {
    function generateRandomString(length: number) {
      var characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      var randomString = "";
      for (var i = 0; i < length; i++) {
        randomString += characters.charAt(
          Math.floor(Math.random() * characters.length)
        );
      }
      return randomString;
    }

    var randomString = generateRandomString(6);
    console.log("randomString => ", randomString);

    await UserModal.findOneAndUpdate(
      { _id: id },
      { temp_email: email, verify_code: randomString }
    );

    sendEmail({
      toMail: email,
      username: currentUser.username,
      subject: "Email verification",
      content: `Your verification code is: ${randomString}`,
      register: true
    });

    return res.json({ verify: true });
  } catch (error) {
    console.log("email verification error => ", email);
    return res.status(500).json({ err: "Email is not valid!" });
  }

  // const newUser = await User.findByIdAndUpdate(
  //   id,
  //   { email },
  //   { new: true, upsert: true }
  // );
};

export const emailVerify = async (req: AuthRequest, res: Response) => {
  const { id } = req.user;
  const { verify_code } = req.body;
  console.log("verify_code => ", verify_code);
  try {
    const user = await UserModal.findById(id);
    if (!id) return res.status(500).json({ err: "This user does not exist!" });
    if (!user?.verify_code || user.verify_code === "")
      return res
        .status(500)
        .json({ err: "You are not in verification state!" });

    if (!verify_code || verify_code === "") {
      return res.status(500).json({ err: "Please provide a verify code!" });
    } else {
      if (verify_code.toUpperCase() === user?.verify_code.toUpperCase()) {
        const newUser = await UserModal.findByIdAndUpdate(
          id,
          { email: user?.temp_email },
          { new: true, upsert: true }
        );
        res.json(newUser);
      } else {
        res.status(500).json({ err: "Invalid verify code." });
      }
    }
  } catch (error) {
    console.log("email verify error => ", error);
    res.status(500).json({ err: error });
  }
};
export const updateAvatar = async (req: AuthRequest, res: Response) => {
  const { id } = req.user;
  const { avatar } = req.body;
  console.log("id ===> ", id);
  console.log("avatar ===> ", avatar);
  if (!avatar) return res.status(400).json({ err: "Avatar not provided" });

  try {
    const matches = avatar.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    const type = matches[1];
    const data = Buffer.from(matches[2], "base64");

    let ext;
    switch (type) {
      case "image/png":
        ext = "png";
        break;
      case "image/jpeg":
        ext = "jpg";
        break;
      case "image/gif":
        ext = "gif";
        break;
      case "image/bmp":
        ext = "bmp";
        break;
      case "image/webp":
        ext = "webp";
        break;
      case "image/svg+xml":
        ext = "svg";
        break;
      // Add more image types as needed
      default:
        throw new Error("Unsupported image type");
    }
    const filename = `${id}.${ext}`;
    const filePath = path.join(__dirname, `../../public`, filename);

    fs.writeFile(filePath, data, (err) => {
      if (err) {
        console.error("Error saving file:", err);
      } else {
        console.log("File saved successfully!");
      }
    });

    const newUser = await User.findByIdAndUpdate(
      id,
      {
        avatar: filename,
      },
      { new: true, upsert: true }
    );

    return res.json(newUser);
  } catch (e) {
    console.error(e);
    return res.status(500).json(e);
  }
};

export const updateAvatarByNft = async (req: AuthRequest, res: Response) => {
  const { id } = req.user;
  const { avatar } = req.body;
  if (!avatar) return res.status(400).json({ err: "Avatar not provided" });

  try {
    const newUser = await User.findByIdAndUpdate(
      id,
      {
        avatar,
      },
      { new: true, upsert: true }
    );

    return res.json(newUser);
  } catch (e) {
    console.error(e);
    return res.status(500).json(e);
  }
};

export const updateNotification = async (req: AuthRequest, res: Response) => {
  const { id } = req.user;
  const { notifications } = req.body;

  if (!notifications)
    return res.status(400).json({ err: "Notifications not provided" });

  try {
    const newUser = await User.findByIdAndUpdate(
      id,
      {
        notifications,
      },
      { new: true, upsert: true }
    );

    return res.json(newUser);
  } catch (e) {
    console.error(e);
    return res.status(500).json(e);
  }
};
