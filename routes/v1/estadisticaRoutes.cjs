const express = require('express');
const router = express.Router();
const estadistica = require('../../controllers/v1/estadisticaCtrl.cjs');

router.post('/', estadistica.crearEstadisticasUsuario);
router.get('/:uid', estadistica.obtenerEstadisticasUsuario);
router.put('/:uid', estadistica.actualizarEstadisticasUsuario);
router.delete('/:uid', estadistica.eliminarEstadisticasUsuario);

module.exports = router;