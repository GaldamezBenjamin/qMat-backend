const express = require('express');
const router = express.Router();
const forumController = require('../controllers/foroCtrl.cjs');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware.cjs');

// Apply verifyToken middleware to all forum routes
router.use(verifyToken);

// Get all forums (Accessible to all authenticated users)
router.get('/', forumController.getAllForums);

// Get forum by ID (Accessible to all authenticated users)
router.get('/:id_foro', forumController.getForumById);

// Create a new forum (Any authenticated user can create)
router.post('/', forumController.createForum);

// Update an existing forum (Only creator or admin can update)
router.put('/:id_foro', forumController.updateForum); // Authorization logic is within the controller

// Delete a forum (Only creator or admin can delete)
router.delete('/:id_foro', forumController.deleteForum); // Authorization logic is within the controller

module.exports = router;