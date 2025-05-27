require('dotenv').config();

const express = require('express')
const cors = require('cors');
const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173'
}));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Backend de qMática funcionando!');
});

const quizRoutes = require('./routes/quizRoutes.cjs');
const preguntaRoutes = require('./routes/preguntaRoutes.cjs');
const usuarioRoutes = require('./routes/usuarioRoutes.cjs');
const foroRoutes = require('./routes/foroRoutes.cjs');
const estadisticaRoutes = require('./routes/estadisticaRoutes.cjs');
const categoriaRoutes = require('./routes/categoriaRoutes.cjs');

app.use('/api/quizzes', quizRoutes);
app.use('/api/preguntas', preguntaRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/foros', foroRoutes);
app.use('/api/estadisticas', estadisticaRoutes);
app.use('/api/categorias', categoriaRoutes);

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Backend server running on port: ${port}`);
  console.log(`Access at: http://localhost:${port}`);
});