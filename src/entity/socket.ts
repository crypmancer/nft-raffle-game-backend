import { Server } from "socket.io";
import { Express } from "express";
import http from "http";

import chatController from "../controllers/chatController";
import gameController from "../controllers/web3Controller";

const startSocketServer = (server: http.Server, app: Express) => {
  try {
    // Main socket.io instance
    const io = new Server(server, {
      cors: { origin: "*", methods: ["GET", "POST"] },
    });

    // Make the socket connection accessible at the routes
    app.set("socketio", io);

    // Start listeners
    chatController.listen(io);
    gameController.listen(io);

    console.log("========>> Socket started! ✔️");
  } catch (error: any) {
    console.log(`========>> ${error.message} 🤢`);

    // Exit current process with failure
    process.exit(1);
  }
};

// Export functions
export default startSocketServer;
