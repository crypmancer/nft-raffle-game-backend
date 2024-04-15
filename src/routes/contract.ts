import { Router } from "express";

import { GetAllRisks, getAllTemps, getNfts } from "../controllers";
import web3Controller from "../controllers/web3Controller";

const router = Router();

// const updateMetadata = async (nfts: any[], newOwner: string) => {
//   try {
//     nfts.map(
//       async (
//         nft: { nftAddress: string; nftId: any; nftAmount: any },
//         index: any
//       ) => {
//         const currentMetaData = await Metadata.findOne(
//           {
//             address: nft.nftAddress.toLowerCase(),
//             tokens: {
//               $elemMatch: {
//                 nftId: nft.nftId,
//               },
//             },
//           },
//           {
//             "tokens.$": 1, // This is a projection to return only the matching token
//           }
//         );
//         console.log(currentMetaData);
//         const newAmount =
//           Number(currentMetaData?.tokens[0].amount) - Number(nft.nftAmount);
//         console.log(newAmount);
//         const filter = {
//           address: nft.nftAddress!.toLowerCase(),
//           "tokens.nftId": nft.nftId,
//         };
//         const update = {
//           $set: {
//             "tokens.$.owner": newOwner.toLowerCase(),
//             "tokens.$.amount": newAmount.toString(),
//           },
//         };
//         const options = {
//           new: true,
//           upsert: true,
//         };
//         const updatedMetaData = await Metadata.findOneAndUpdate(
//           filter,
//           update,
//           options
//         );
//       }
//     );
//   } catch (error) {
//     console.log(error);
//   }
// };

// @route    GET api/contract/getNfts
// @desc     Get all nfts by wallet
// @access   Public
router.get("/getNfts", getNfts);

// @route    GET api/contract/GetAllRisks
// @desc     Get all risks
// @access   Public
router.get("/getAllRisks", GetAllRisks);

// @route    GET api/contract/getAllTemps
// @desc     Get all Temp risks
// @access   Public
router.get("/getAllTemps", getAllTemps);

// Register new Risk
// router.post("/registerRisk", registerRisk);

// // create offer
// router.post("/createOffer", createOffer);

// //Accept risk
// router.post("/acceptRisk", acceptRisk);

// // cancel offer
// router.post("/cancelOffer", cancelOffer);

// pending risk
router.post("/pendingRisk", web3Controller.pendingRisk);

export default router;
