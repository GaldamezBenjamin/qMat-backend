const express = require('express');
const router = express.Router();
const quizCtrl = require('../controllers/quizCtrl.cjs');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware.cjs');

// Apply verifyToken middleware to all quiz routes
router.use(verifyToken);

// Get all quizzes (Accessible to all authenticated users)
router.get('/', quizCtrl.getAllQuizzes);

// Get quiz by ID (Accessible to all authenticated users)
router.get('/:id_quiz', quizCtrl.getQuizById);

// GET /api/quizzes/:id_quiz/questions (preguntas de un quiz)
router.get('/:id_quiz/questions', quizCtrl.getQuestionsByQuizId);

// Create a new quiz (Admin only)
router.post('/', authorizeRoles('admin'), quizCtrl.createQuiz);

// Update an existing quiz (Admin only)
router.put('/:id_quiz', authorizeRoles('admin'), quizCtrl.updateQuiz);

// Delete a quiz (Admin only)
router.delete('/:id_quiz', authorizeRoles('admin'), quizCtrl.deleteQuiz);

// Generate a quiz (Admin only)
router.post('/generate', authorizeRoles('admin'), quizCtrl.generateQuizNames);

module.exports = router;