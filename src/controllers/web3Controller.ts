import { Alchemy, Network } from "alchemy-sdk";
import { Request, Response } from "express";
import Web3 from "web3";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";

import {
  axiosInstance,
  CONTRACT_ALCHEMY_API_KEY,
  INft,
  IParticipant,
  IRisk,
  ITemp,
  ITempContract,
  JWT_PRIVATE_KEY,
  MORALIS_API_KEY,
  NEWASSETDEPOSITED_EVENT,
  NEWORDERED_EVENT,
  NEWRISKREGISTERED_EVENT,
  PRIVATE_KEY,
  RISKING_ABI,
  RISKING_ADDRESS,
} from "../config";

import Collection from "../models/Collection";
import Risk from "../models/Risk";
import Temp from "../models/Temp";
import User from "../models/User";
import { sendEmail } from "./mailer";
import { getAllRisks } from "./contractController";
import NotificationModel from "../models/Notification";

// web3 config
const url = `https://eth-sepolia.g.alchemy.com/v2/${CONTRACT_ALCHEMY_API_KEY}`;
const web3 = new Web3(url);
const account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);

const riskingContract = new web3.eth.Contract(RISKING_ABI, RISKING_ADDRESS);

const settings = {
  apiKey: CONTRACT_ALCHEMY_API_KEY, // Replace with your Alchemy API Key
  network: Network.ETH_GOERLI, // Replace with your network
};
const alchemy = new Alchemy(settings);

const updateDB = async (riskId: string, api: string) => {
  console.log(`Updating risk(${riskId}) status...`);
  try {
    const risk: IRisk = await riskingContract.methods
      // @ts-ignore
      .getRiskById(riskId)
      .call();

    const participants: IParticipant[] = await Promise.all(
      risk.participants.map(async (participant) => {
        const nftTokens = await Promise.all(
          participant.nftTokens.map(async (token) => {
            try {
              const filter = {
                address: token.nftAddress.toLowerCase(),
                "tokens.nftId": token.nftId,
              };

              let update;
              if (api === "register" || api === "createOffer") {
                update = {
                  $set: {
                    "tokens.$.owner": RISKING_ADDRESS.toLowerCase(),
                    "tokens.$.amount": {
                      $subtract: [
                        { $toInt: "$tokens.nftAmount" },
                        { $toInt: token.nftAmount },
                      ],
                    },
                  },
                };
              } else if (api === "cancelRisk") {
                update = {
                  $set: {
                    "tokens.$.owner": participant.owner.toLowerCase(),
                    "tokens.$.amount": {
                      $add: [
                        { $toInt: "$tokens.nftAmount" },
                        { $toInt: token.nftAmount },
                      ],
                    },
                  },
                };
              }

              const updatedMetaData = await Collection.findOneAndUpdate(
                filter,
                update,
                { upsert: true, new: true }
              );

              return {
                nftAddress: token.nftAddress.toLowerCase(),
                nftId: token.nftId.toString(),
                nftAmount: (token.nftAmount || "0").toString(),
                nftName: updatedMetaData?.tokens[0].nftName,
                nftUri: updatedMetaData?.tokens[0].nftUri,
              };
            } catch (e) {
              console.log(e);
              return {
                nftAddress: token.nftAddress.toLowerCase(),
                nftId: token.nftId.toString(),
                nftAmount: (token.nftAmount || "0").toString(),
                nftName: "",
                nftUri: "",
              };
            }
          })
        );

        return {
          owner: participant.owner,
          etherValue: participant.etherValue.toString(),
          nftTokens,
        };
      })
    );

    const updatedRisk = await Risk.findOneAndUpdate(
      { riskId: riskId },
      {
        author: risk.author,
        registeredTime: risk.registeredTime.toString(),
        endedTime: risk.endedTime.toString(),
        state: Number(risk.state),
        participants,
        playerId: risk.playerId.toString(),
        winner: risk.winner,
        randomResult: risk.randomResult,
      },
      { upsert: true, new: true }
    );

    return updatedRisk;
  } catch (e) {
    console.log(e);
  } finally {
    console.log("Finished updating.");
  }
};

const updateTempDB = async (tempId: string) => {
  try {
    // @ts-ignore
    const temp: any = await riskingContract.methods.getTempById(tempId).call();

    const updatePromises = temp.deposit.nftTokens.map(async (t: INft) => {
      try {
        const collectionUpdate = Collection.findOneAndUpdate(
          {
            address: t.nftAddress.toLowerCase(),
            "tokens.nftId": t.nftId,
          },
          {
            $set: {
              "tokens.$.owner": temp.deposit.owner.toLowerCase(),
            },
            $inc: {
              "tokens.$.amount": Number(t.nftAmount), // Increment amount by t.nftAmount
            },
          },
          {
            new: true,
            upsert: true,
          }
        );

        return collectionUpdate;
      } catch (e) {
        console.error(e);
      }
    });

    await Promise.all(updatePromises);

    await Temp.findOneAndUpdate(
      { tempId: temp.id.toString() },
      { state: temp.state },
      { upsert: true, new: true }
    );

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

// export const registerRisk = async (req: Request, res: Response) => {
//   console.log("Registering new Risk ...");

//   const txHash: string = req.body.txHash;
//   if (!txHash) return res.status(403).send("Missing Parameter!");

//   const rept = await web3.eth.getTransactionReceipt(txHash);

//   try {
//     const collections = await Collection.find();
//     const eventId = web3.eth.abi.encodeEventSignature(NEWASSETDEPOSITED_EVENT);
//     const logs = rept.logs.filter((log) => log.topics![0] === eventId);
//     const deposits: any = logs.map((log) =>
//       web3.eth.abi.decodeLog(
//         NEWASSETDEPOSITED_EVENT.inputs,
//         log.data!.toString(),
//         log.topics!.map((t) => t.toString())
//       )
//     );
//     const tempId = deposits[0].id;
//     const nftTokens = deposits[0].nftTokens;
//     const totalEtherValue = web3.utils.fromWei(deposits[0].etherValue, "ether");
//     let totalNftPrice = 0;
//     for (let i = 0; i < nftTokens.length; i++) {
//       const collection = collections.filter(
//         (c) => c.address!.toLowerCase() == nftTokens[i].nftAddress.toLowerCase()
//       )[0];
//       totalNftPrice += collection.price;
//     }

//     const lockedEtherValue =
//       (Number(totalEtherValue) - 0.03 * totalNftPrice) / 1.03;
//     const fee = Number(totalEtherValue) - lockedEtherValue;
//     console.log(fee);

//     if (fee) {
//       const transactionData = riskingContract.methods
//         // @ts-ignore
//         .createRisk(tempId, web3.utils.toWei(fee.toFixed(7), "ether"))
//         .encodeABI();

//       const txObj = {
//         from: account.address,
//         to: RISKING_ADDRESS,
//         data: transactionData,
//       };
//       const gas = await web3.eth.estimateGas(txObj);
//       const gasPrice = await web3.eth.getGasPrice();

//       const signedTx = await account.signTransaction({
//         ...txObj,
//         gas,
//         gasPrice,
//       });
//       const txReceipt = await web3.eth.sendSignedTransaction(
//         signedTx.rawTransaction
//       );
//       const reptNewRegister = await web3.eth.getTransactionReceipt(
//         txReceipt.transactionHash
//       );

//       const newRegisterEventId = web3.eth.abi.encodeEventSignature(
//         NEWRISKREGISTERED_EVENT
//       );
//       const riskLogs = reptNewRegister.logs.filter(
//         (log) => log.topics![0] === newRegisterEventId
//       );
//       const newRiskLogs: any = riskLogs.map((log) =>
//         web3.eth.abi.decodeLog(
//           NEWRISKREGISTERED_EVENT.inputs,
//           log.data!.toString(),
//           log.topics!.map((t) => t.toString())
//         )
//       );
//       await updateDB(newRiskLogs[0].id, "register");
//       const newRisk = {
//         id: newRiskLogs[0].id.toString(),
//         author: newRiskLogs[0].author,
//         nfts: Number(newRiskLogs[0].nftAmounts),
//         eth: web3.utils.fromWei(newRiskLogs[0].etherValue, "ether"),
//       };
//       return res.send(newRisk);
//     }
//   } catch (e) {
//     console.log(e);
//     return res.status(500).send(e);
//   }
// };

const pendingRisk = async (req: Request, res: Response) => {
  const tempId = req.body.tempId;
  if (!tempId) return res.status(403).send("Missing Parameter!");
  try {
    await updateTempDB(tempId);
    res.send("Successfully updated!");
  } catch (error) {
    res.status(500).send(error);
  }
};

// export const createOffer = async (req: Request, res: Response) => {
//   console.log("Offer creating ... ");

//   const { riskId, txHash } = req.body;
//   if (!riskId || !txHash) return res.status(400).send("Missing Parameter!");

//   const rept = await web3.eth.getTransactionReceipt(txHash);
//   try {
//     const collections = await Collection.find();
//     const eventId = web3.eth.abi.encodeEventSignature(NEWASSETDEPOSITED_EVENT);
//     const logs = rept.logs.filter((log) => log.topics![0] === eventId);
//     const deposits: any = logs.map((log) =>
//       web3.eth.abi.decodeLog(
//         NEWASSETDEPOSITED_EVENT.inputs,
//         log.data!.toString(),
//         log.topics!.map((t) => t.toString())
//       )
//     );
//     const tempId = deposits[0].id;
//     const nftTokens = deposits[0].nftTokens;
//     const totalEtherValue = web3.utils.fromWei(
//       deposits[0]!.etherValue,
//       "ether"
//     );
//     let totalNftPrice = 0;
//     for (let i = 0; i < nftTokens.length; i++) {
//       const collection = collections.filter(
//         (c) => c.address!.toLowerCase() == nftTokens[i].nftAddress.toLowerCase()
//       )[0];
//       totalNftPrice += collection.price;
//     }

//     const lockedEtherValue =
//       (Number(totalEtherValue) - 0.03 * totalNftPrice) / 1.03;
//     const fee = Number(totalEtherValue) - lockedEtherValue;
//     console.log(fee);
//     if (fee) {
//       const transactionData = riskingContract.methods
//         // @ts-ignore
//         .createOffer(riskId, tempId, web3.utils.toWei(fee.toFixed(7), "ether"))
//         .encodeABI();
//       const txObj = {
//         from: account.address,
//         to: RISKING_ADDRESS,
//         data: transactionData,
//       };

//       const gas = await web3.eth.estimateGas(txObj);
//       const gasPrice = await web3.eth.getGasPrice();

//       const signedTx = await account.signTransaction({
//         ...txObj,
//         gas,
//         gasPrice,
//       });

//       const txReceipt = await web3.eth.sendSignedTransaction(
//         signedTx.rawTransaction
//       );
//       const reptNewRegister = await web3.eth.getTransactionReceipt(
//         txReceipt.transactionHash
//       );

//       const newRegisterEventId =
//         web3.eth.abi.encodeEventSignature(NEWORDERED_EVENT);
//       const riskLogs = reptNewRegister.logs.filter(
//         (log) => log.topics![0] === newRegisterEventId
//       );
//       const newRiskLogs: any = riskLogs.map((log) =>
//         web3.eth.abi.decodeLog(
//           NEWORDERED_EVENT.inputs,
//           log.data!.toString(),
//           log.topics!.map((t) => t.toString())
//         )
//       );
//       await updateDB(newRiskLogs[0].id, "createOffer");
//       // res.status(400).redirect(JSON.stringify("error"));
//       const author = await User.findOne({
//         walletAddress: newRiskLogs[0].participant,
//       });
//       if (author?.email) {
//         sendEmail({
//           toMail: author.email,
//           username: author?.username || author.email,
//           subject: "You received offer",
//           content: `Your risk ${newRiskLogs[0]} has received a new offer.`,
//         });
//       }
//       console.log("newRiskLogs[0]", newRiskLogs[0]);
//       const newOffer = {
//         id: newRiskLogs[0].id.toString(),
//         author: newRiskLogs[0].author,
//         nfts: Number(newRiskLogs[0].nftAmounts),
//         eth: web3.utils.fromWei(newRiskLogs[0].etherValue, "ether"),
//       };
//       console.log("newOffer", newOffer);
//       res.send(newOffer);
//     }
//   } catch (e) {
//     console.log(e);
//     res.status(500).send(e);
//   }
// };

// export const cancelOffer = async (req: Request, res: Response) => {
//   const { riskId } = req.body;
//   if (!riskId) return res.status(400).send("Missing Risk Id");
//   try {
//     // @ts-ignore
//     const risk: any = await riskingContract.methods.getRiskById(riskId).call();

//     const participants = await Promise.all(
//       risk.participants.map(
//         async (p: {
//           nftTokens: any[];
//           owner: any;
//           etherValue: { toString: () => any };
//         }) => {
//           const nftTokens = await Promise.all(
//             p.nftTokens.map(async (t: any) => {
//               try {
//                 const metadata = await Collection.findOne(
//                   {
//                     address: t[0].toLowerCase(),
//                     tokens: {
//                       $elemMatch: {
//                         nftId: t[1],
//                       },
//                     },
//                   },
//                   {
//                     "tokens.$": 1, // This is a projection to return only the matching token
//                   }
//                 );
//                 return {
//                   nftAddress: t[0].toLowerCase(),
//                   nftId: t[1].toString(),
//                   nftAmount: (t.nftAmount ?? "0").toString(),
//                   nftName: metadata!.tokens[0].nftName,
//                   nftUri: metadata!.tokens[0].nftUri,
//                 };
//               } catch (e) {
//                 return {
//                   nftAddress: t[0].toLowerCase(),
//                   nftId: t[1].toString(),
//                   nftAmount: (t.nftAmount ?? "0").toString(),
//                   nftName: "",
//                   nftUri: "",
//                 };
//               }
//             })
//           );

//           return {
//             owner: p.owner,
//             etherValue: p.etherValue.toString(),
//             nftTokens,
//           };
//         }
//       )
//     );
//     await Risk.findOneAndUpdate(
//       { riskId: risk.id.toString() },
//       {
//         author: risk.author,
//         registeredTime: risk.registeredTime.toString(),
//         endedTime: risk.endedTime.toString(),
//         state: Number(risk.state),
//         participants,
//         playerId: risk.playerId.toString(),
//         winner: risk.winner,
//         randomResult: risk.randomResult,
//       },
//       {
//         upsert: true,
//         new: true,
//       }
//     );
//     // updateMetadata(nftAddres, nftIds, nftAmounts, newOwner);
//     res.status(200).send("Success!");
//   } catch (error) {
//     console.log(error);
//     res.status(500).send("Internal server error!");
//   }
// };

// export const acceptRisk = async (req: Request, res: Response) => {
//   const { riskId } = req.body;
//   if (!riskId) return res.status(403).send("Missing risk Id!");

//   console.log("riskId", riskId);

//   const topic =
//     "0xa31bdc3a2ccbbdf768e8e9945f2896561b9cf226cec3ad0355bf2a73f82be968";

//   const hackrDaoMintEvents = {
//     address: RISKING_ADDRESS,
//     topics: [topic],
//   };

//   const doSomethingWithTxn = async (txn: {
//     data: any;
//     transactionHash: any;
//   }) => {
//     const data = txn.data;
//     const transactionHash = txn.transactionHash;
//     const newRiskId = web3.utils.toBigInt(data.slice(0, 66)).toString();
//     const winner = "0x" + data.slice(90);

//     console.log("newRiskId", newRiskId);
//     console.log("winner", winner);
//     if (newRiskId === riskId) {
//       try {
//         const risk: any = await riskingContract.methods
//           // @ts-ignore
//           .getRiskById(riskId)
//           .call();
//         risk.participants[0].nftTokens.map(async (t: any[]) => {
//           try {
//             const collection = await Collection.findOne(
//               {
//                 address: t[0].toLowerCase(),
//                 tokens: {
//                   $elemMatch: {
//                     nftId: t[1],
//                   },
//                 },
//               },
//               {
//                 "tokens.$": 1,
//               }
//             );
//             const newAmount =
//               Number(collection?.tokens[0].nftAmount) + Number(t[2]);
//             const filter = {
//               address: t[0].toLowerCase(),
//               "tokens.nftId": t[1],
//             };
//             const update = {
//               $set: {
//                 "tokens.$.owner": winner.toLowerCase(),
//                 "tokens.$.amount": newAmount.toString(),
//               },
//             };
//             const options = {
//               new: true,
//               upsert: true,
//             };
//             await Collection.findOneAndUpdate(filter, update, options);
//           } catch (e) {
//             console.log(e);
//           }
//         });
//         risk.participants[risk.playerId].nftTokens.map(async (t: any[]) => {
//           try {
//             const metadata = await Collection.findOne(
//               {
//                 address: t[0].toLowerCase(),
//                 tokens: {
//                   $elemMatch: {
//                     nftId: t[1],
//                   },
//                 },
//               },
//               {
//                 "tokens.$": 1,
//               }
//             );
//             const newAmount =
//               Number(metadata?.tokens[0].nftAmount) + Number(t[2]);
//             const filter = {
//               address: t[0].toLowerCase(),
//               "tokens.nftId": t[1],
//             };
//             const update = {
//               $set: {
//                 "tokens.$.owner": winner.toLowerCase(),
//                 "tokens.$.amount": newAmount.toString(),
//               },
//             };
//             const options = {
//               new: true,
//               upsert: true,
//             };
//             await Collection.findOneAndUpdate(filter, update, options);
//           } catch (e) {
//             console.log(e);
//           }
//         });

//         await Risk.findOneAndUpdate(
//           { riskId },
//           {
//             author: risk.author,
//             registeredTime: risk.registeredTime.toString(),
//             endedTime: risk.endedTime.toString(),
//             state: Number(risk.state),
//             playerId: risk.playerId.toString(),
//             winner: risk.winner,
//             randomResult: risk.randomResult,
//             txHash:
//               "https://goerli.etherscan.io/tx/" + transactionHash + "#eventlog",
//           },
//           {
//             upsert: true,
//             new: true,
//           }
//         );
//         res.send({ winner: winner, txHash: transactionHash });
//       } catch (e) {
//         console.log(e);
//       } finally {
//         console.log("Finished updating.");
//       }
//     }
//   };

//   alchemy.ws.on(hackrDaoMintEvents, doSomethingWithTxn);

//   // to do list
//   // Open the websocket and listen for events!
// };

const getAllData = async () => {
  console.log("Updating Risking status...");
  const allRisks: IRisk[] = await riskingContract.methods.getAllRisks().call();

  try {
    await Promise.all(
      allRisks
        .filter((risk) => risk.participants.length !== 0)
        .map(async (risk) => {
          return await Risk.findOneAndUpdate(
            { riskId: risk.id },
            {
              author: risk.author,
              registeredTime: risk.registeredTime,
              endedTime: risk.endedTime,
              state: Number(risk.state),
              participants: risk.participants,
              playerId: risk.playerId,
              winner: risk.winner,
              randomResult: risk.randomResult,
            },
            {
              upsert: true,
              new: true,
            }
          );
        })
    );
  } catch (e) {
    console.log(
      "|||||||||||||||||----- Risk updating error -----|||||||||||||||||",
      e
    );
  } finally {
    console.log("Finished Risk updating.");
  }

  console.log("Updating Temp status...");
  const allTemps: ITempContract[] = await riskingContract.methods
    .getAllTemps()
    .call();
  try {
    await Promise.all(
      allTemps.map(async (temp) => {
        await Temp.findOneAndUpdate(
          { tempId: temp.id.toString() },
          {
            state: Number(temp.state),
            deposit: temp.deposit,
          },
          {
            upsert: true,
            new: true,
          }
        );
      })
    );
  } catch (e) {
    console.log(
      "|||||||||||||||||-----Temp updating error-----|||||||||||||||||",
      e
    );
  } finally {
    console.log("Finished Temp updating.");
  }
};

const getNftDataByCollection = async () => {
  console.info("updating metadata ...");
  try {
    const collections = await Collection.find();

    await Promise.all(
      collections.map(async (collection) => {
        let nextCursor = "";
        let nftMetadata = [];

        do {
          const moralisRequestOptions = {
            method: "GET",
            url: `https://deep-index.moralis.io/api/v2.2/nft/${collection.address}/owners`,
            params: {
              chain: "sepolia",
              format: "decimal",
              limit: "100",
              cursor: nextCursor,
            },
            headers: {
              accept: "application/json",
              "x-api-key": MORALIS_API_KEY,
            },
          };

          const response = await axiosInstance.request(moralisRequestOptions);
          const { result, cursor } = response.data;

          const newData = result.map((data: any) => {
            let tokenUri = JSON.parse(data.metadata)?.image || "";
            tokenUri = tokenUri.replace("ipfs://", "https://ipfs.io/ipfs/");
            tokenUri = tokenUri.replace("nftstorage.link", "ipfs.io");
            return {
              owner: data.owner_of,
              nftId: data.token_id,
              nftAmount: data.contract_type === "ERC721" ? "0" : data.amount,
              nftUri: tokenUri,
              nftName: data.metadata?.name || collection.name,
            };
          });

          nftMetadata.push(...newData);
          nextCursor = cursor;
        } while (nextCursor);

        console.log("Getting new metadata...");

        await Collection.findOneAndUpdate(
          { address: collection.address },
          {
            contract_type:
              nftMetadata.length > 0 ? nftMetadata[0].contract_type : "",
            tokens: nftMetadata,
          },
          { upsert: true, new: true }
        );
      })
    );

    console.info("Metadata updating completed successfully!");
  } catch (error) {
    console.error("Metadata updating error:", error);
  }
};

// Get socket.io instance
const listen = (io: Server) => {
  io.of("/game").on("connection", (socket) => {
    let loggedIn = false;

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
            return socket.emit("user banned");
          } else {
            loggedIn = true;
            socket.join(String(id));
          }
        }
      } catch (error) {
        loggedIn = false;
        return socket.emit("notify-error", "Authentication token is not valid");
      }
    });

    // Create a new chat message
    socket.on("new-risk", async (txHash) => {
      // Validate user input
      if (typeof txHash !== "string")
        return socket.emit("notify-error", "Invalid Txhash Type!");
      if (!txHash) return socket.emit("notify-error", "Missing Txhash!");
      if (txHash.trim() === "")
        return socket.emit("notify-error", "Invalid Txhash Length!");

      console.log("Registering new Risk ...");

      try {
        const rept = await web3.eth.getTransactionReceipt(txHash);

        const collections = await Collection.find();
        const eventId = web3.eth.abi.encodeEventSignature(
          NEWASSETDEPOSITED_EVENT
        );
        const logs = rept.logs.filter((log) => log.topics![0] === eventId);
        const deposits: any = logs.map((log) =>
          web3.eth.abi.decodeLog(
            NEWASSETDEPOSITED_EVENT.inputs,
            log.data!.toString(),
            log.topics!.map((t) => t.toString())
          )
        );
        const tempId = deposits[0].id;
        const nftTokens = deposits[0].nftTokens;
        const totalEtherValue = web3.utils.fromWei(
          deposits[0].etherValue,
          "ether"
        );
        let totalNftPrice = 0;
        for (let i = 0; i < nftTokens.length; i++) {
          const collection = collections.filter(
            (c) =>
              c.address!.toLowerCase() == nftTokens[i].nftAddress.toLowerCase()
          )[0];
          totalNftPrice += collection.price;
        }

        const lockedEtherValue =
          (Number(totalEtherValue) - 0.03 * totalNftPrice) / 1.03;
        const fee = Number(totalEtherValue) - lockedEtherValue;
        console.log(fee);

        if (fee) {
          const transactionData = riskingContract.methods
            // @ts-ignore
            .createRisk(tempId, web3.utils.toWei(fee.toFixed(7), "ether"))
            .encodeABI();

          const txObj = {
            from: account.address,
            to: RISKING_ADDRESS,
            data: transactionData,
          };
          const gas = await web3.eth.estimateGas(txObj);
          const gasPrice = await web3.eth.getGasPrice();

          const signedTx = await account.signTransaction({
            ...txObj,
            gas,
            gasPrice,
          });
          const txReceipt = await web3.eth.sendSignedTransaction(
            signedTx.rawTransaction
          );
          const reptNewRegister = await web3.eth.getTransactionReceipt(
            txReceipt.transactionHash
          );

          const newRegisterEventId = web3.eth.abi.encodeEventSignature(
            NEWRISKREGISTERED_EVENT
          );
          const riskLogs = reptNewRegister.logs.filter(
            (log) => log.topics![0] === newRegisterEventId
          );
          const newRiskLogs: any = riskLogs.map((log) =>
            web3.eth.abi.decodeLog(
              NEWRISKREGISTERED_EVENT.inputs,
              log.data!.toString(),
              log.topics!.map((t) => t.toString())
            )
          );
          await updateDB(newRiskLogs[0].id, "register");
          const newRisk = {
            id: newRiskLogs[0].id.toString(),
            author: newRiskLogs[0].author,
            nfts: Number(newRiskLogs[0].nftAmounts),
            eth: web3.utils.fromWei(newRiskLogs[0].etherValue, "ether"),
          };

          const users = await User.find({
            "notifications.alertDetails.createdNewRisk": true,
          });

          for (const user of users) {
            const noti = new NotificationModel({
              userId: user._id,
              content: `New risk #${newRisk.id} created by ${user.walletAddress}`,
            });
            await noti.save();
          }

          return socket.emit("new-risk-created", newRisk);
        }
      } catch (error) {
        console.log(error);
        return socket.emit("notify-error", error);
      }
    });

    // Create a new chat message
    socket.on("new-offer", async (riskId, txHash) => {
      // Validate user input
      if (typeof txHash !== "string")
        return socket.emit("notify-error", "Invalid Txhash Type!");
      if (!riskId || !txHash)
        return socket.emit("notify-error", "Missing Params!");
      if (txHash.trim() === "")
        return socket.emit("notify-error", "Invalid Txhash Length!");

      console.log("Offer creating ... ");

      console.log("txHash", txHash);
      console.log("riskId", riskId);

      try {
        const rept = await web3.eth.getTransactionReceipt(txHash);
        const collections = await Collection.find();
        const eventId = web3.eth.abi.encodeEventSignature(
          NEWASSETDEPOSITED_EVENT
        );
        const logs = rept.logs.filter((log) => log.topics![0] === eventId);
        const deposits: any = logs.map((log) =>
          web3.eth.abi.decodeLog(
            NEWASSETDEPOSITED_EVENT.inputs,
            log.data!.toString(),
            log.topics!.map((t) => t.toString())
          )
        );
        const tempId = deposits[0].id;
        const nftTokens = deposits[0].nftTokens;
        const totalEtherValue = web3.utils.fromWei(
          deposits[0]!.etherValue,
          "ether"
        );
        let totalNftPrice = 0;
        for (let i = 0; i < nftTokens.length; i++) {
          const collection = collections.filter(
            (c) =>
              c.address!.toLowerCase() == nftTokens[i].nftAddress.toLowerCase()
          )[0];
          totalNftPrice += collection.price;
        }

        const lockedEtherValue =
          (Number(totalEtherValue) - 0.03 * totalNftPrice) / 1.03;
        const fee = Number(totalEtherValue) - lockedEtherValue;
        console.log(fee);
        if (fee) {
          const transactionData = riskingContract.methods
            .createOffer(
              // @ts-ignore
              riskId,
              tempId,
              web3.utils.toWei(fee.toFixed(5), "ether")
            )
            .encodeABI();
          const txObj = {
            from: account.address,
            to: RISKING_ADDRESS,
            data: transactionData,
          };

          const gas = await web3.eth.estimateGas(txObj);
          const gasPrice = await web3.eth.getGasPrice();

          const signedTx = await account.signTransaction({
            ...txObj,
            gas,
            gasPrice,
          });

          const txReceipt = await web3.eth.sendSignedTransaction(
            signedTx.rawTransaction
          );
          const reptNewRegister = await web3.eth.getTransactionReceipt(
            txReceipt.transactionHash
          );

          const newRegisterEventId =
            web3.eth.abi.encodeEventSignature(NEWORDERED_EVENT);
          const riskLogs = reptNewRegister.logs.filter(
            (log) => log.topics![0] === newRegisterEventId
          );
          const newRiskLogs: any = riskLogs.map((log) =>
            web3.eth.abi.decodeLog(
              NEWORDERED_EVENT.inputs,
              log.data!.toString(),
              log.topics!.map((t) => t.toString())
            )
          );
          await updateDB(newRiskLogs[0].id, "createOffer");
          // res.status(400).redirect(JSON.stringify("error"));
          const author = await User.findOne({
            walletAddress: newRiskLogs[0].participant,
          });
          if (author?.email) {
            sendEmail({
              toMail: author.email,
              username: author?.username || author.email,
              subject: "You received offer",
              content: `Your risk ${newRiskLogs[0]} has received a new offer.`,
            });
          }
          console.log("newRiskLogs[0]", newRiskLogs[0]);
          const newOffer = {
            id: newRiskLogs[0].id.toString(),
            author: newRiskLogs[0].participant,
            nfts: Number(newRiskLogs[0].nftAmounts),
            eth: web3.utils.fromWei(newRiskLogs[0].etherValue, "ether"),
          };
          console.log("newOffer", newOffer);

          const users = await User.find({
            "notifications.alertDetails.createdNewOffer": true,
          });

          // Create notifications for users with created new offer alert enabled
          const notificationsPromises = users.map(async (user) => {
            const noti = new NotificationModel({
              userId: user._id,
              content: `New Offer created by ${newOffer.author} at risk #${newOffer.id}`,
            });
            await noti.save();
          });

          // Wait for all notifications to be saved
          await Promise.all(notificationsPromises);

          const risk = await Risk.findOne({ riskId: newOffer.id });
          if (risk) {
            // Find the user based on the risk author and offer received alert enabled
            const user = await User.findOne({
              walletAddress: risk.author,
              "notifications.alertDetails.offerReceived": true,
            });

            if (user) {
              // Create notification for the user who received the offer
              const noti = new NotificationModel({
                userId: user._id,
                content: `Offer received by ${newOffer.author} at risk #${newOffer.id}`,
              });
              await noti.save();
            }
          }
          return socket.emit("new-offer-created", newOffer);
        }
      } catch (error) {
        console.log(error);
        return socket.emit("notify-error", error);
      }
    });

    // Create a new chat message
    socket.on("cancel-offer", async (riskId) => {
      // Validate user input
      if (!riskId) return socket.emit("notify-error", "Missing Risk Id");

      try {
        const risk: any = await riskingContract.methods
          // @ts-ignore
          .getRiskById(riskId)
          .call();

        const participants = await Promise.all(
          risk.participants.map(
            async (p: {
              nftTokens: any[];
              owner: any;
              etherValue: { toString: () => any };
            }) => {
              const nftTokens = await Promise.all(
                p.nftTokens.map(async (t: any) => {
                  try {
                    const metadata = await Collection.findOne(
                      {
                        address: t[0].toLowerCase(),
                        tokens: {
                          $elemMatch: {
                            nftId: t[1],
                          },
                        },
                      },
                      {
                        "tokens.$": 1, // This is a projection to return only the matching token
                      }
                    );
                    return {
                      nftAddress: t[0].toLowerCase(),
                      nftId: t[1].toString(),
                      nftAmount: (t.nftAmount ?? "0").toString(),
                      nftName: metadata!.tokens[0].nftName,
                      nftUri: metadata!.tokens[0].nftUri,
                    };
                  } catch (e) {
                    return {
                      nftAddress: t[0].toLowerCase(),
                      nftId: t[1].toString(),
                      nftAmount: (t.nftAmount ?? "0").toString(),
                      nftName: "",
                      nftUri: "",
                    };
                  }
                })
              );

              return {
                owner: p.owner,
                etherValue: p.etherValue.toString(),
                nftTokens,
              };
            }
          )
        );

        await Risk.findOneAndUpdate(
          { riskId: risk.id.toString() },
          {
            author: risk.author,
            registeredTime: risk.registeredTime.toString(),
            endedTime: risk.endedTime.toString(),
            state: Number(risk.state),
            participants,
            playerId: risk.playerId.toString(),
            winner: risk.winner,
            randomResult: risk.randomResult,
          },
          {
            upsert: true,
            new: true,
          }
        );

        const users = await User.find({
          "notifications.alertDetails.offerReturned": true,
        });

        // Create notifications for users with created new offer alert enabled
        const notificationsPromises = users.map(async (user) => {
          const noti = new NotificationModel({
            userId: user._id,
            content: `Offer cancel at risk #${riskId}`,
          });
          await noti.save();
        });

        // Wait for all notifications to be saved
        await Promise.all(notificationsPromises);

        const riskings = await getAllRisks();
        return socket.emit("offer-cancelled", riskings);
      } catch (error) {
        console.error(error);
        return socket.emit("notify-error", error);
      }
    });

    // accept risk
    socket.on("accept-risk", async (riskId) => {
      // Validate user input
      if (!riskId) return socket.emit("notify-error", "Missing Risk Id");

      console.log('accept risk offer => ', riskId)

      const topic =
        "0xa31bdc3a2ccbbdf768e8e9945f2896561b9cf226cec3ad0355bf2a73f82be968";

      const hackrDaoMintEvents = {
        address: RISKING_ADDRESS,
        topics: [topic],
      };

      const doSomethingWithTxn = async (txn: {
        data: any;
        transactionHash: any;
      }) => {
        console.log('doSomethingWithTxn', ' == data ==>', txn)
        const data = txn.data;
        const transactionHash = txn.transactionHash;
        const newRiskId = web3.utils.toBigInt(data.slice(0, 66)).toString();
        const winner = "0x" + data.slice(90);

        console.log("newRiskId", newRiskId);
        console.log("winner", winner);
        if (newRiskId === riskId) {
          try {
            const risk: any = await riskingContract.methods
              // @ts-ignore
              .getRiskById(riskId)
              .call();
            risk.participants[0].nftTokens.map(async (t: any[]) => {
              try {
                const collection = await Collection.findOne(
                  {
                    address: t[0].toLowerCase(),
                    tokens: {
                      $elemMatch: {
                        nftId: t[1],
                      },
                    },
                  },
                  {
                    "tokens.$": 1,
                  }
                );
                const newAmount =
                  Number(collection?.tokens[0].nftAmount) + Number(t[2]);
                const filter = {
                  address: t[0].toLowerCase(),
                  "tokens.nftId": t[1],
                };
                const update = {
                  $set: {
                    "tokens.$.owner": winner.toLowerCase(),
                    "tokens.$.amount": newAmount.toString(),
                  },
                };
                const options = {
                  new: true,
                  upsert: true,
                };
                await Collection.findOneAndUpdate(filter, update, options);
              } catch (e) {
                console.log(e);
                return socket.emit("notify-error");
              }
            });
            risk.participants[risk.playerId].nftTokens.map(async (t: any[]) => {
              try {
                const metadata = await Collection.findOne(
                  {
                    address: t[0].toLowerCase(),
                    tokens: {
                      $elemMatch: {
                        nftId: t[1],
                      },
                    },
                  },
                  {
                    "tokens.$": 1,
                  }
                );
                const newAmount =
                  Number(metadata?.tokens[0].nftAmount) + Number(t[2]);
                const filter = {
                  address: t[0].toLowerCase(),
                  "tokens.nftId": t[1],
                };
                const update = {
                  $set: {
                    "tokens.$.owner": winner.toLowerCase(),
                    "tokens.$.amount": newAmount.toString(),
                  },
                };
                const options = {
                  new: true,
                  upsert: true,
                };
                await Collection.findOneAndUpdate(filter, update, options);
              } catch (e) {
                console.log(e);
                return socket.emit("notify-error");
              }
            });

            console.log('1')

            await Risk.findOneAndUpdate(
              { riskId },
              {
                author: risk.author,
                registeredTime: risk.registeredTime.toString(),
                endedTime: risk.endedTime.toString(),
                state: Number(risk.state),
                playerId: risk.playerId.toString(),
                winner: risk.winner,
                randomResult: risk.randomResult,
                txHash:
                  "https://goerli.etherscan.io/tx/" +
                  transactionHash +
                  "#eventlog",
              },
              {
                upsert: true,
                new: true,
              }
            );

            console.log('2')
            const users = await User.find({
              "notifications.alertDetails.completedRisk": true,
            });

            console.log('3')
            // Create notifications for users with created new offer alert enabled
            const notificationsPromises = users.map(async (user) => {
              const noti = new NotificationModel({
                userId: user._id,
                content: `Risk #${riskId} is completed`,
              });
              await noti.save();
            });
            
            console.log('4')

            // Wait for all notifications to be saved
            await Promise.all(notificationsPromises);

            
            console.log('5')

            return socket.emit("risk-completed", {
              winner: winner,
              txHash: transactionHash,
            });
          } catch (error) {
            console.error(error);
            return socket.emit("notify-error");
          }
        }
      };

      
      console.log('6')

      alchemy.ws.on(hackrDaoMintEvents, doSomethingWithTxn);
    });
  });
};

export default {
  listen,
  getAllData,
  getNftDataByCollection,
  updateDB,
  updateTempDB,
  pendingRisk,
};
