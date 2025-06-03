const express = require('express');
const router = express.Router();
const statisticController = require('../controllers/estadisticaCtrl.cjs');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware.cjs');

// Apply verifyToken middleware to all statistic routes
router.use(verifyToken);

// Get all statistics (Admin only)
router.get('/', authorizeRoles('admin'), statisticController.getAllStatistics);

// Get statistics for a specific user (User can get their own, Admin can get any)
router.get('/:uid', statisticController.getStatisticByUid);

// Create or initialize statistics for a user (Authenticated user, or admin for another user)
router.post('/', statisticController.createStatistic); // UID comes from token, not body

// Update statistics for a user (User can update their own, Admin can update any)
router.put('/:uid', statisticController.updateStatistic);

// Atomically update specific subcategory statistics (User can update their own, Admin can update any)
router.patch('/:uid/subcategories', statisticController.updateSubCategoryStats);

// Delete statistics for a user (Admin only)
router.delete('/:uid', authorizeRoles('admin'), statisticController.deleteStatistic);

module.exports = router;