import { Router } from "express";

import { getAllNotifications, readNotification } from "../controllers";
import { authMiddleware } from "../middlewares";

const router = Router();

router.get("/getAll", authMiddleware, getAllNotifications);
router.post("/update", authMiddleware, readNotification);

export default router;
