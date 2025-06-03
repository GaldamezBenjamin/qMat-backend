const express = require('express');
const router = express.Router();
const subCategoryController = require('../controllers/subCategoriaCtrl.cjs');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware.cjs');

// Apply verifyToken middleware to all subcategory routes
router.use(verifyToken);

// Get all subcategories (Accessible to all authenticated users)
router.get('/', subCategoryController.getAllSubCategories);

// Get subcategory by ID (Accessible to all authenticated users)
router.get('/:id_subcategoria', subCategoryController.getSubCategoryById);

// Create a new subcategory (Admin only)
router.post('/', authorizeRoles('admin'), subCategoryController.createSubCategory);

// Update an existing subcategory (Admin only)
router.put('/:id_subcategoria', authorizeRoles('admin'), subCategoryController.updateSubCategory);

// Delete a subcategory (Admin only)
router.delete('/:id_subcategoria', authorizeRoles('admin'), subCategoryController.deleteSubCategory);

module.exports = router;