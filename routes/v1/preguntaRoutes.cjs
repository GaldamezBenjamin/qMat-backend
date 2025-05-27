const express = require('express');
const router = express.Router();
const pregunta = require('../controllers/v1/preguntaCtrl.cjs');

router.post('/', pregunta.crearPregunta);
router.get('/', pregunta.obtenerPreguntas);
router.get('/:id', pregunta.obtenerPregunta);
router.put('/:id', pregunta.actualizarPregunta);
router.delete('/:id', pregunta.eliminarPregunta);

module.exports = router;