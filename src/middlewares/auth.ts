import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";

import { JWT_PRIVATE_KEY } from "../config";
import { AuthRequest } from "../interfaces/auth.interface";

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // Get token from header
  const token = req.header("x-auth-token");

  // Check if not token
  if (!token) {
    return res.status(401).json({ err: "No token, authorization denied" });
  }

  // Verify token
  try {
    const decoded: any = jwt.verify(token, JWT_PRIVATE_KEY);
    req.user = decoded.user;
    next();
  } catch (err) {
    console.error("Something went wrong with the auth middleware", err);
    return res.status(401).json({ err: "Token is not valid" });
  }
};
