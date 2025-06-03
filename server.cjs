require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  })
);
app.use(bodyParser.json());

const usuarioRoutes = require("./routes/usuarioRoutes.cjs");
const categoriaRoutes = require("./routes/categoriaRoutes.cjs");
const subCategoriaRoutes = require("./routes/subCategoriaRoutes.cjs");
const foroRoutes = require("./routes/foroRoutes.cjs");
const mensajeForoRoutes = require("./routes/mensajeForoRoutes.cjs");
const estadisticaRoutes = require("./routes/estadisticaRoutes.cjs");
const preguntaRoutes = require("./routes/preguntaRoutes.cjs");
const quizRoutes = require("./routes/quizRoutes.cjs");
const intentoQuizRoutes = require("./routes/intentoQuizRoutes.cjs");

app.use("/api/usuarios", usuarioRoutes);
app.use("/api/categorias", categoriaRoutes);
app.use("/api/subcategorias", subCategoriaRoutes);
app.use("/api/foros", foroRoutes);
app.use("/api/mensajesforos", mensajeForoRoutes);
app.use("/api/estadisticas", estadisticaRoutes);
app.use("/api/preguntas", preguntaRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/intentosquizzes", intentoQuizRoutes);

// Global error handler for Zod validation errors
app.use((err, req, res, next) => {
  if (err instanceof z.ZodError) {
    // Map Zod errors for a cleaner response
    const errors = err.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));
    return res
      .status(400)
      .json({ message: "Error de validación de datos.", errors: errors });
  }
  console.error(err); // Log unexpected errors
  res.status(500).json({ message: "Error interno del servidor." });
});

// Basic error handling for undefined routes
app.use((req, res, next) => {
  res.status(404).json({ message: "Ruta no encontrada." });
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Backend server running on port: ${port}`);
  console.log(`Access at: http://localhost:${port}/api`);
});
