import express from "express";
import { createSale, getSales, createSalesWithDetails } from "../controllers/salesController.js";
const router = express.Router();
 
// 🟢 Rutas generales después
router.get("/", getSales);
router.post("/", createSale);
router.post("/bulk", createSalesWithDetails)


export default router;