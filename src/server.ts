import { createServer } from "http";
import colors from "colors";

import app from "./entity/app";
import startSocketServer from "./entity/socket";
import connectDatabase from "./utils/db";
import { PORT } from "./config";

connectDatabase();

const server = createServer(app);

startSocketServer(server, app);

server.listen(PORT, () => {
  console.log(colors.green(`🎇Risking server🎇 is running on port ${PORT}.`));
});
