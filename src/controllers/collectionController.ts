import { Request, Response } from "express";
import Collection from "../models/Collection";

export const getAllCollections = async (req: Request, res: Response) => {
  try {
    const collections = await Collection.find({ approved: true });
    res.send(collections);
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
};

export const addCollection = async (req: Request, res: Response) => {
  const {
    name,
    twitter,
    discord,
    opensea,
    address,
    comment,
    contact,
    chainId,
  } = req.body;
  try {
    const info = {
      twitter,
      discord,
      opensea,
      comment,
      contact,
      chainId,
    };
    const newCollection = await Collection.findOneAndUpdate(
      { address: address },
      {
        name,
        info: info,
      },
      {
        upsert: true,
        new: true,
      }
    );
    res.status(200).json(newCollection);
  } catch (error) {
    res.status(500).json(error);
  }
};
