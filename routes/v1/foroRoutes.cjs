const express = require('express');
const router = express.Router();
const foro = require('../controllers/v1/foroCtrl.cjs');

router.post('/', foro.crearForo);
router.get('/', foro.obtenerForos);
router.get('/:id_foro', foro.obtenerForo);
router.put('/:id_foro', foro.actualizarForo);
router.delete('/:id_foro', foro.eliminarForo);

// Rutas para la subcolección Mensajes_Foro
router.post('/:id_foro/mensajes_foro', foro.crearMensajeForo);
router.get('/:id_foro/mensajes_foro', foro.obtenerMensajesForo);
router.get('/:id_foro/mensajes_foro/:id_mensaje', foro.obtenerMensajeForo);
router.put('/:id_foro/mensajes_foro/:id_mensaje', foro.actualizarMensajeForo);
router.delete('/:id_foro/mensajes_foro/:id_mensaje', foro.eliminarMensajeForo);

module.exports = router;