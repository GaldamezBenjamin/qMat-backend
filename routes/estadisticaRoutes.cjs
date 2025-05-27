const express = require('express');
const router = express.Router();
const EstadisticaController = require('../controllers/EstadisticaController.cjs');

router.post('/', EstadisticaController.crearEstadisticasUsuario);
router.get('/:uid', EstadisticaController.obtenerEstadisticasUsuario);
router.put('/:uid', EstadisticaController.actualizarEstadisticasUsuario);
router.delete('/:uid', EstadisticaController.eliminarEstadisticasUsuario);

module.exports = router;