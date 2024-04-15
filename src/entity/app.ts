import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import helmet from "helmet";
import path from "path";
import rateLimit from "express-rate-limit";

import userRoutes from "../routes/user";
import collectionRoutes from "../routes/collection";
import contractRoutes from "../routes/contract";
import notificationRoutes from "../routes/notification";

const app = express();

const whitelists = [
  "http://localhost:5173, https://dev.risking.io, http://192.168.109.84:5173",
];

const corsOrigin = {
  allowedOrigins: whitelists,
  credentials: true,
  optionSuccessStatus: 200,
};

// Create request limiter
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute, original 5 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  message: {
    success: false,
    error: "Too many requests, please try again later.",
  },
});

// App config
app.use(cors(corsOrigin));

app.use(helmet());

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, "../public")));

app.get("/", async (req, res) => {
  res.send("❤️ Risking server ❤️ is running...");
});

// api routers
app.use("/api/user", [limiter, userRoutes]);
app.use("/api/collection", [limiter, collectionRoutes]);
app.use("/api/contract", [limiter, contractRoutes]);
app.use("/api/notification", [limiter, notificationRoutes]);

export default app;
