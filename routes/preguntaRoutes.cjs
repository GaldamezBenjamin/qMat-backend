const express = require('express');
const router = express.Router();
const questionController = require('../controllers/preguntaCtrl.cjs');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware.cjs');

// Apply verifyToken middleware to all question routes
router.use(verifyToken);

// Get all questions (can be filtered by id_subcategoria, accessible to all authenticated users)
router.get('/', questionController.getAllQuestions);

// Get question by ID (Accessible to all authenticated users)
router.get('/:id_pregunta', questionController.getQuestionById);

// Create a new question (Admin only)
router.post('/', authorizeRoles('admin'), questionController.createQuestion);

// Update an existing question (Admin only)
router.put('/:id_pregunta', authorizeRoles('admin'), questionController.updateQuestion);

// Delete a question (Admin only)
router.delete('/:id_pregunta', authorizeRoles('admin'), questionController.deleteQuestion);

module.exports = router;