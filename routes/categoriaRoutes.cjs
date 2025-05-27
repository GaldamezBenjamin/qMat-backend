const express = require('express');
const router = express.Router();
const CategoriaController = require('../controllers/CategoriaController.cjs');

router.post('/', CategoriaController.crearCategoria);
router.get('/', CategoriaController.obtenerCategorias);
router.get('/:id_categoria', CategoriaController.obtenerCategoria);
router.put('/:id_categoria', CategoriaController.actualizarCategoria);
router.delete('/:id_categoria', CategoriaController.eliminarCategoria);

module.exports = router;