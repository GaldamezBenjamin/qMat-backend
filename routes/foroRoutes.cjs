const express = require('express');
const router = express.Router();
const ForoController = require('../controllers/ForoController.cjs');

router.post('/', ForoController.crearForo);
router.get('/', ForoController.obtenerForos);
router.get('/:id_foro', ForoController.obtenerForo);
router.put('/:id_foro', ForoController.actualizarForo);
router.delete('/:id_foro', ForoController.eliminarForo);

// Rutas para la subcolección Mensajes_Foro
router.post('/:id_foro/mensajes_foro', ForoController.crearMensajeForo);
router.get('/:id_foro/mensajes_foro', ForoController.obtenerMensajesForo);
router.get('/:id_foro/mensajes_foro/:id_mensaje', ForoController.obtenerMensajeForo);
router.put('/:id_foro/mensajes_foro/:id_mensaje', ForoController.actualizarMensajeForo);
router.delete('/:id_foro/mensajes_foro/:id_mensaje', ForoController.eliminarMensajeForo);

module.exports = router;