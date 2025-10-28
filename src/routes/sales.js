import express from "express";
import { createSale, getSales, getSalesById, createSalesWithDetails } from "../controllers/salesController.js";
const router = express.Router();
 
// 🟢 Rutas generales después
router.post("/bulk", createSalesWithDetails)


router.get("/", getSales);
router.get("/:id", getSalesById);
router.post("/", createSale);


export default router;