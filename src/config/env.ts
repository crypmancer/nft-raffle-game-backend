import * as dotenv from "dotenv";

try {
  dotenv.config();
} catch (error) {
  console.error("Error loading environment variables:", error);
  process.exit(1);
}

export const PRIVATE_KEY = "0x" + process.env.PRIVATE_KEY || "PRIVATE_KEY";

export const JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY || "JWT_PRIVATE_KEY";
export const JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY || "JWT_PUBLIC_KEY";
export const JWT_ALGORITHM = process.env.JWT_ALGORITHM || "JWT_ALGORITHM";
export const JWT_EXPIRE_TIME = process.env.JWT_EXPIRE_TIME || "JWT_EXPIRE_TIME";

export const CONTRACT_ALCHEMY_API_KEY =
  process.env.CONTRACT_ALCHEMY_API_KEY || "CONTRACT_ALCHEMY_API_KEY";
export const PRICE_ALCHEMY_API_KEY = process.env.PRICE_ALCHEMY_API_KEY;
export const MORALIS_API_KEY = process.env.MORALIS_API_KEY;
export const MAILJET_API_KEY = process.env.MAILJET_API_KEY || "MAILJET_API_KEY";
export const MAILJET_SECRET_KEY =
  process.env.MAILJET_SECRET_KEY || "MAILJET_SECRET_KEY";

export const DB_NAME = process.env.DB_NAME;
export const DB_USERNAME = process.env.DB_USERNAME;
export const DB_PASSWORD = process.env.DB_PASSWORD;
export const DB_HOST = process.env.DB_HOST;
export const DB_PORT = process.env.DB_PORT;

export const PORT = process.env.PORT || 8000;
export const INDEXER_PORT = process.env.INDEXER_PORT || 8008;
