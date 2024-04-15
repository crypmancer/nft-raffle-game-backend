import express from "express";
import cron from "node-cron";
import { createServer } from "http";
import colors from "colors";

import { INDEXER_PORT } from "./config";
import web3Controller from "./controllers/web3Controller";
import connectDatabase from "./utils/db";

connectDatabase();

const app = express();
const server = createServer(app);

cron.schedule("*/2 * * * *", web3Controller.getAllData);

cron.schedule("0 * * * *", web3Controller.getNftDataByCollection);

server.listen(INDEXER_PORT, () => {
  console.log(
    colors.green(`🎇Risking Cron server🎇 is running on port ${INDEXER_PORT}.`)
  );
});
