const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoriaCtrl.cjs');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware.cjs');

// Apply verifyToken middleware to all category routes
router.use(verifyToken);

// Get all categories (Accessible to all authenticated users)
router.get('/', categoryController.getAllCategories);

// Get category by ID (Accessible to all authenticated users)
router.get('/:id_categoria', categoryController.getCategoryById);

// Create a new category (Admin only)
router.post('/', authorizeRoles('admin'), categoryController.createCategory);

// Update an existing category (Admin only)
router.put('/:id_categoria', authorizeRoles('admin'), categoryController.updateCategory);

// Delete a category (Admin only)
router.delete('/:id_categoria', authorizeRoles('admin'), categoryController.deleteCategory);

module.exports = router;