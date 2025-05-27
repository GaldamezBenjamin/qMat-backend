require('dotenv').config();

const express = require('express')
const cors = require('cors');
const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173'
}));
app.use(express.json());

const quizRoutes = require('./routes/v1/quizRoutes.cjs');
const preguntaRoutes = require('./routes/v1/preguntaRoutes.cjs');
const usuarioRoutes = require('./routes/v1/usuarioRoutes.cjs');
const foroRoutes = require('./routes/v1/foroRoutes.cjs');
const estadisticaRoutes = require('./routes/v1/estadisticaRoutes.cjs');
const categoriaRoutes = require('./routes/v1/categoriaRoutes.cjs');
const superCategoriaRoutes = require('./routes/v1/superCategoriaRoutes.cjs');

app.use('/api/v1/quizzes', quizRoutes);
app.use('/api/v1/preguntas', preguntaRoutes);
app.use('/api/v1/usuarios', usuarioRoutes);
app.use('/api/v1/foros', foroRoutes);
app.use('/api/v1/estadisticas', estadisticaRoutes);
app.use('/api/v1/categorias', categoriaRoutes);
app.use('/api/v1/super-categorias', superCategoriaRoutes);

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Backend server running on port: ${port}`);
  console.log(`Access at: http://localhost:${port}`);
});