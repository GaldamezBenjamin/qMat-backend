const express = require('express');
const router = express.Router();
const usuario = require('../controllers/v1/usuarioCtrl.cjs');

router.post('/', usuario.crearUsuario);
router.get('/', usuario.obtenerUsuarios);
router.get('/:uid', usuario.obtenerUsuario);
router.put('/:uid', usuario.actualizarUsuario);
router.delete('/:uid', usuario.eliminarUsuario);

// Rutas para la subcolección Intentos_Quiz
router.post('/:uid/intentos_quiz', usuario.crearIntentoQuiz);
router.get('/:uid/intentos_quiz', usuario.obtenerIntentosQuiz);
router.get('/:uid/intentos_quiz/:id_intento', usuario.obtenerIntentoQuiz);
router.put('/:uid/intentos_quiz/:id_intento', usuario.actualizarIntentoQuiz);
router.delete('/:uid/intentos_quiz/:id_intento', usuario.eliminarIntentoQuiz);

module.exports = router;