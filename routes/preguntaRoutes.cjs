const express = require('express');
const router = express.Router();
const preguntaCtrl = require('../controllers/preguntaCtrl.cjs');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware.cjs');

// Apply verifyToken middleware to all question routes
router.use(verifyToken);

// Get all questions (can be filtered by id_subcategoria, accessible to all authenticated users)
router.get('/', preguntaCtrl.getAllQuestions);

// Generate a question (Admin only)
router.post('/generate', authorizeRoles('admin'), preguntaCtrl.generateQuizQuestions);

// Get question by ID (Accessible to all authenticated users)
router.get('/:id_pregunta', preguntaCtrl.getQuestionById);

// Create a new question (Admin only)
router.post('/', authorizeRoles('admin'), preguntaCtrl.createQuestion);

// Update an existing question (Admin only)
router.put('/:id_pregunta', authorizeRoles('admin'), preguntaCtrl.updateQuestion);

// Delete a question (Admin only)
router.delete('/:id_pregunta', authorizeRoles('admin'), preguntaCtrl.deleteQuestion);

module.exports = router;