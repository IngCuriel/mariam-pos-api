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
const PORT = 4000; // puerto fijo
app.listen(PORT,() => {
  console.log(`Servidor corriendo en :${PORT}`);
});
