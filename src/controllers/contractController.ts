import { Request, Response } from "express";

import { ITemp } from "../config";

import Collection from "../models/Collection";
import Risk from "../models/Risk";
import Temp from "../models/Temp";
import User from "../models/User";

export const getNfts = async (req: Request, res: Response) => {
  const { walletAddress } = req.query;
  const address = walletAddress?.toString().toLowerCase();
  try {
    const tokens = await Collection.aggregate([
      {
        $match: {
          "tokens.owner": address,
        },
      },
      {
        $unwind: "$tokens", // Unwind the tokens array to process each token
      },
      {
        $match: {
          "tokens.owner": address,
        },
      },
      {
        $set: {
          // Use $set to add the necessary fields
          "tokens.nftAddress": "$address",
          "tokens.nftPrice": "$price",
        },
      },
      {
        $replaceRoot: { newRoot: "$tokens" }, // Make the token the root of the document
      },
    ]).exec();

    return res.send(tokens);
  } catch (e) {
    console.error(e);
    return res.status(400).send(e);
  }
};

export const getAllRisks = async () => {
  try {
    const risks: any[] = await Risk.aggregate([
      {
        $addFields: {
          numericRiskId: { $toInt: "$riskId" }, // Convert riskId to an integer
        },
      },
      {
        $sort: { numericRiskId: -1 }, // Sort by the new numeric field
      },
    ]);
    const risksWithPrice = await Promise.all(
      risks.map(async (risk) => {
        const participantsWithTokens = await Promise.all(
          risk.participants.map(async (p: any) => {
            const nftTokensWithPrice = await Promise.all(
              p.nftTokens.map(async (token: any) => {
                const collection = await Collection.findOne(
                  {
                    address: token.nftAddress?.toLowerCase(),
                    tokens: {
                      $elemMatch: {
                        nftId: token.nftId,
                      },
                    },
                  },
                  { price: 1, name: 1, "tokens.$": 1 }
                );
                return {
                  nftAddress: token.nftAddress,
                  nftId: token.nftId,
                  nftAmount: token.nftAmount,
                  nftName: collection?.name,
                  nftUri: collection?.tokens[0].nftUri,
                  nftPrice: collection ? collection.price : 0,
                };
              })
            );
            const owner = await User.findOne({
              walletAddress: p.owner,
              isActive: true,
            });
            return {
              owner: owner
                ? owner
                : {
                    username: p.owner,
                    walletAddress: p.owner,
                  },
              etherValue: p.etherValue,
              nftTokens: nftTokensWithPrice,
            };
          })
        );

        const author = await User.findOne({
          walletAddress: risk.author?.toLowerCase(),
          isActive: true,
        });
        const winner = await User.findOne({
          walletAddress: risk.winner?.toLowerCase(),
          isActive: true,
        });
        return {
          id: risk.riskId,
          author: author
            ? author
            : { walletAddress: risk.author, username: risk.author },
          registeredTime: risk.registeredTime,
          endedTime: risk.endedTime,
          state: risk.state,
          participants: participantsWithTokens,
          playerId: risk.playerId,
          winner: winner
            ? winner
            : {
                walletAddress: risk.winner,
                username: risk.winner,
              },
          randomResult: risk.randomResult,
          txHash: risk.txHash,
        };
      })
    );
    return { risks: risksWithPrice, error: "" };
  } catch (error) {
    console.error(error);
    return { risks: [], error };
  }
};

export const getAllTemps = async (_req: Request, res: Response) => {
  try {
    const temps: ITemp[] = await Temp.aggregate([{ $match: { state: 0 } }]);
    const tempsWithPrice = await Promise.all(
      temps.map(async (temp) => {
        const participantsWithTokens = await Promise.all(
          temp.deposit.nftTokens.map(async (token) => {
            const collection = await Collection.findOne(
              {
                address: token.nftAddress?.toLowerCase(),
                tokens: {
                  $elemMatch: {
                    nftId: token.nftId,
                  },
                },
              },
              { price: 1, name: 1, "tokens.$": 1 }
            );
            return {
              nftAddress: token.nftAddress,
              nftId: token.nftId,
              nftAmount: token.nftAmount,
              nftName: collection?.name,
              nftUri: collection?.tokens[0].nftUri,
              nftPrice: collection ? collection.price : 0,
            };
          })
        );
        const owner = await User.findOne({
          walletAddress: temp.deposit.owner?.toLowerCase(),
          isActive: true,
        });

        return {
          id: temp.tempId,
          state: temp.state,
          deposit: {
            owner: owner
              ? owner
              : {
                  walletAddress: temp.deposit.owner,
                  username: temp.deposit.owner,
                },
            etherValue: temp.deposit.etherValue,
            nftTokens: participantsWithTokens,
          },
        };
      })
    );

    res.status(200).send(tempsWithPrice);
  } catch (e) {
    console.log(e);
    res.status(500).send(e);
  }
};

export const GetAllRisks = async (_req: Request, res: Response) => {
  const { risks, error } = await getAllRisks();
  if (error) return res.status(500).json(error);
  else return res.json(risks);
};
