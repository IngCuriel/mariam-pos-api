import express from "express";
import { 
  createSale, 
  getSales, 
  getSalesById, 
  createSalesWithDetails,
  getSalesStats,
  getBranchStats
} from "../controllers/salesController.js";
const router = express.Router();
 
// 🟢 Rutas de estadísticas (antes de las rutas con parámetros)
router.get("/stats", getSalesStats);
router.get("/stats/branch/:branch", getBranchStats);

// 🟢 Rutas generales
router.post("/bulk", createSalesWithDetails);
router.get("/", getSales);
router.get("/:id", getSalesById);
router.post("/", createSale);

export default router;