import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

import { verifySignature, verifyWallet } from "./tokenController";
import { generateRandomNonce } from "../lib/generator";

import User from "../models/User";
import { AuthRequest, IPayloadUserJwt } from "../interfaces";
import { JWT_EXPIRE_TIME, JWT_PRIVATE_KEY } from "../config";

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
      role: user?.role
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
  if (user)
    return res.status(427).json({ err: "Provided email is already exist" });

  const newUser = await User.findByIdAndUpdate(
    id,
    { email },
    { new: true, upsert: true }
  );

  return res.json(newUser);
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
