const express = require('express');
const router = express.Router();
const PreguntaController = require('../controllers/PreguntaController.cjs');

router.post('/', PreguntaController.crearPregunta);
router.get('/', PreguntaController.obtenerPreguntas);
router.get('/:id', PreguntaController.obtenerPregunta);
router.put('/:id', PreguntaController.actualizarPregunta);
router.delete('/:id', PreguntaController.eliminarPregunta);

module.exports = router;