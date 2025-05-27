const express = require('express');
const router = express.Router();
const categoria = require('../../controllers/v1/categoriaCtrl.cjs');

router.post('/', categoria.crearCategoria);
router.get('/', categoria.obtenerCategorias);
router.get('/:id_categoria', categoria.obtenerCategoria);
router.put('/:id_categoria', categoria.actualizarCategoria);
router.delete('/:id_categoria', categoria.eliminarCategoria);

module.exports = router;