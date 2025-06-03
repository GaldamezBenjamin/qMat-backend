const express = require('express');
const router = express.Router();
const forumMessageController = require('../controllers/mensajeForoCtrl.cjs');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware.cjs');

// Apply verifyToken middleware to all forum message routes
router.use(verifyToken);

// Get all messages for a specific forum (Accessible to all authenticated users)
router.get('/forum/:id_foro', forumMessageController.getMessagesByForumId);

// Get a single message by ID (Accessible to all authenticated users)
router.get('/:id_mensaje', forumMessageController.getMessageById);

// Create a new message (Any authenticated user can create)
router.post('/', forumMessageController.createMessage);

// Update an existing message (Only author or admin can update)
router.put('/:id_mensaje', forumMessageController.updateMessage); // Authorization logic is within the controller

// Delete a message (Only author or admin can delete)
router.delete('/:id_mensaje', forumMessageController.deleteMessage); // Authorization logic is within the controller

module.exports = router;