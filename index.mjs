import express from "express";
import cors from "cors"

// Configuración del servidor
// -------------------
const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res)=>{
  res.send("Hello word")
})
// -------------------
// Iniciar servidor
// -------------------
const PORT = 3002; // puerto fijo
app.listen(PORT, "127.0.0.1", () => {
  console.log(`Servidor corriendo en http://127.0.0.1:${PORT}`);
});
