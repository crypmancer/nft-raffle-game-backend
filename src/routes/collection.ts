import { Router } from "express";
import { addCollection, getAllCollections } from "../controllers";

const router = Router();

//get all collections
router.get("/getAllCollections", getAllCollections);

//add new collection
router.post("/addCollection", addCollection);

export default router;
