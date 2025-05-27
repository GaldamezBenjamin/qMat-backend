const express = require('express');
const router = express.Router();
const UsuarioController = require('../controllers/UsuarioController.cjs');

router.post('/', UsuarioController.crearUsuario);
router.get('/', UsuarioController.obtenerUsuarios);
router.get('/:uid', UsuarioController.obtenerUsuario);
router.put('/:uid', UsuarioController.actualizarUsuario);
router.delete('/:uid', UsuarioController.eliminarUsuario);

// Rutas para la subcolección Intentos_Quiz
router.post('/:uid/intentos_quiz', UsuarioController.crearIntentoQuiz);
router.get('/:uid/intentos_quiz', UsuarioController.obtenerIntentosQuiz);
router.get('/:uid/intentos_quiz/:id_intento', UsuarioController.obtenerIntentoQuiz);
router.put('/:uid/intentos_quiz/:id_intento', UsuarioController.actualizarIntentoQuiz);
router.delete('/:uid/intentos_quiz/:id_intento', UsuarioController.eliminarIntentoQuiz);

module.exports = router;