import jwt from "jsonwebtoken";
import { Server } from "socket.io";

import User from "../models/User";
import ChatModel from "../models/Chat";
import throttler from "../utils/throttler";
import { JWT_PRIVATE_KEY } from "../config";

// Get socket.io instance
const listen = (io: Server) => {
  io.of("/chat").on("connection", (socket) => {
    let loggedIn = false;
    let userId = "";

    // // Throttle connnections
    // socket.use(throttler(socket));

    // Authenticate websocket connection
    socket.on("auth", async (token) => {
      if (!token) {
        loggedIn = false;
        return socket.emit(
          "error",
          "No authentication token provided, authorization declined"
        );
      }

      try {
        // Verify token
        const decoded: any = jwt.verify(token, JWT_PRIVATE_KEY);
        const { id } = decoded.user;

        const user = await User.findById(id);
        if (user) {
          if (parseInt(user.banExpires) > new Date().getTime()) {
            // console.log("banned");
            loggedIn = false;
            userId = "";
            return socket.emit("user banned");
          } else {
            loggedIn = true;
            userId = id;
            socket.join(String(user._id));

            io.of("/chat").emit("users-online", io.of("/chat").sockets.size);

            const chats = await getChat();
            return socket.emit("broadcast", chats);
          }
        }
      } catch (error) {
        loggedIn = false;
        // return socket.emit("notify-error", "Authentication token is not valid");
      }
    });

    // // Check for users ban status
    // socket.use(async (packet, next) => {
    //   if (loggedIn && userId) {
    //     try {
    //       const user = await User.findById(userId);

    //       // Check if user is banned
    //       if (user && parseInt(user.banExpires) > new Date().getTime()) {
    //         return socket.emit("user banned");
    //       } else {
    //         return next();
    //       }
    //     } catch (error) {
    //       return socket.emit("user banned");
    //     }
    //   } else {
    //     return next();
    //   }
    // });

    // Create a new chat message
    socket.on("new-message", async (message) => {
      // Validate user input
      if (typeof message !== "string")
        return socket.emit("notify-error", "Invalid Message Type!");
      if (message.trim() === "")
        return socket.emit("notify-error", "Invalid Message Length!");
      if (!loggedIn)
        return socket.emit("notify-error", "You are not logged in!");

      // More validation on the message
      if (message.length > 200) {
        return socket.emit(
          "notify-error",
          "Your message length must not exceed 200 characters!"
        );
      }

      try {
        // Construct a new message
        const newChat = new ChatModel({
          userId,
          message,
          created: Date.now(),
        });

        await newChat.save();

        const chats = await getChat();

        // Broadcast message to all clients
        return io.of("/chat").emit("broadcast", chats);
      } catch (error) {
        console.error("Error while sending a chat message:", error);
        return socket.emit(
          "notify-error",
          "Internal server error, please try again later!"
        );
      }
    });

    // User disconnects
    socket.on("disconnect", () => {
      //Update online users count
      io.of("/chat").emit("users-online", io.of("/chat").sockets.size);
    });

    // Update online users count
    io.of("/chat").emit("users-online", io.of("/chat").sockets.size);
  });
};

const getChat = async () => {
  return await ChatModel.aggregate([
    {
      $addFields: {
        convertedUserId: { $toObjectId: "$userId" },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "convertedUserId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" }, // Optional, in case you want to flatten the user array.
    {
      $sort: { time: -1 },
    },
    {
      $limit: 20,
    },
  ]);
};

export default { listen };
