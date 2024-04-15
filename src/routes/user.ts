import { Response, Router } from "express";

import Contact from "../models/Contact";
import {
  loadUser,
  signIn,
  signUp,
  updateAvatar,
  updateEmail,
  updateUsername,
  sendEmail,
  updateAvatarByNft,
  updateNotification,
} from "../controllers";
import { authMiddleware } from "../middlewares";

const router = Router();

router.get("/", authMiddleware, loadUser);
router.post("/signup", signUp);
router.post("/signin", signIn);
router.post("/username", authMiddleware, updateUsername);
router.post("/email", authMiddleware, updateEmail);
router.post("/avatar", authMiddleware, updateAvatar);
router.post("/nft-avatar", authMiddleware, updateAvatarByNft);
router.post("/nft-avatar", authMiddleware, updateAvatarByNft);
router.post("/notification", authMiddleware, updateNotification);

router.post("/contact", async (req, res) => {
  const { name, email, summary } = req.body;
  if (!name || !email || !summary) {
    res.status(403).send("Missing parameters!");
  }
  try {
    await Contact.findOneAndUpdate(
      { email },
      {
        name: name,
        summary: summary,
      },
      {
        upsert: true,
        new: true,
      }
    );
    res.send(200).send("Success!");
  } catch (error) {
    res.send(500).send({ error });
  }
});

export default router;
