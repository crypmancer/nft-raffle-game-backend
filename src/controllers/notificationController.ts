import { Response } from "express";
import { AuthRequest } from "../interfaces";
import NotificationModel from "../models/Notification";

export const getAllNotifications = async (req: AuthRequest, res: Response) => {
  const { id: userId } = req.user;

  try {
    const notifications = await NotificationModel.find({ userId, read: false });
    return res.json(notifications);
  } catch (e) {
    console.error(e);
    return res.status(500).json(e);
  }
};

export const readNotification = async (req: AuthRequest, res: Response) => {
  const { id: userId } = req.user;
  const { notId } = req.body;

  try {
    const newNoti = await NotificationModel.findOneAndUpdate(
      { _id: notId, userId },
      { read: true }
    );
    res.json(newNoti);
  } catch (e) {
    console.error(e);
    return res.status(500).json(e);
  }
};
