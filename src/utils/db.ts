import mongoose from "mongoose";
import colors from "colors";
import {
  DB_HOST,
  DB_NAME,
  DB_PASSWORD,
  DB_PORT,
  DB_USERNAME,
} from "../config";

// const mongoUri = `mongodb://127.0.0.1:27017/risking`;
const mongoUri = `mongodb://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;


const connectDatabase = async () => {
  try {
    await mongoose
      .connect(mongoUri, {
      });
    console.log(
      colors.blue(
        "========>> Connected to the database! ✔️"
      )
    );
  } catch (err) {
    console.log(
      colors.red(
        "========>> Cannot connect to the database! ❌",
      ),
      err
    );

    // Exit current process with failure
    process.exit(1);
  }
};

// Export the util
export default connectDatabase;
