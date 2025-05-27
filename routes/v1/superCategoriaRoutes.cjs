const express = require('express');
const router = express.Router();
const superCategoria = require('../../controllers/v1/superCategoriaCtrl.cjs');

router.post('/', superCategoria.crearSuperCategoria);
router.get('/', superCategoria.obtenerSuperCategorias);
router.get('/:id_super_cat', superCategoria.obtenerSuperCategoria);
router.put('/:id_super_cat', superCategoria.actualizarSuperCategoria);
router.delete('/:id_super_cat', superCategoria.eliminarSuperCategoria);

module.exports = router;