import express from "express";
import cors from "cors"
import  pg from "pg";
import {config} from "dotenv";

config();

const pool = new pg.Pool({
  connectionString:process.env.DATABASE_URL,
  ssl:true
})
// Configuración del servidor
// -------------------
const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res)=>{
  res.send("Hello word")
})

app.get('/sales', async (req, res)=>{
  const response = await pool.query('SELECT NOW()')
  console.log(response);
  return res.json(response.rows[0])
})

// -------------------
// Iniciar servidor
// -------------------
const PORT = 4000; // puerto fijo
app.listen(PORT,() => {
  console.log(`Servidor corriendo en :${PORT}`);
});
