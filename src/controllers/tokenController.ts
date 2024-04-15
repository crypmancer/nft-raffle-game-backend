import * as argon2 from "argon2";
import { recoverMessageAddress, isHex } from "viem";

const VerifyMsg = "Connecting with Risking";

export const verifyWallet = (walletAddress: string) => {
  return isHex(walletAddress) && walletAddress.length === 42;
};

export const verifySignature = async (
  walletAddress: string,
  nonce: string,
  signature: string
): Promise<{ verified: boolean; err: string }> => {
  try {
    const recoveredAddress = await recoverMessageAddress({
      message: `${VerifyMsg}\nNonce: ${nonce}`,
      signature: Buffer.from(signature.slice(2), "hex"),
    });
    console.log(`RecoveredAddress is ${recoveredAddress}`);
    return {
      verified: walletAddress.toLowerCase() === recoveredAddress.toLowerCase(),
      err: "",
    };
  } catch (err: any) {
    console.error(`Invalid signature: ${err}`);
    return {
      verified: false,
      err: err.message,
    };
  }
};

export const tokenHash = async (token: string): Promise<string> => {
  return await argon2.hash(token);
};
