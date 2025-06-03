const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizCtrl.cjs');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware.cjs');

// Apply verifyToken middleware to all quiz routes
router.use(verifyToken);

// Get all quizzes (Accessible to all authenticated users)
router.get('/', quizController.getAllQuizzes);

// Get quiz by ID (Accessible to all authenticated users)
router.get('/:id_quiz', quizController.getQuizById);

// Create a new quiz (Admin only)
router.post('/', authorizeRoles('admin'), quizController.createQuiz);

// Update an existing quiz (Admin only)
router.put('/:id_quiz', authorizeRoles('admin'), quizController.updateQuiz);

// Delete a quiz (Admin only)
router.delete('/:id_quiz', authorizeRoles('admin'), quizController.deleteQuiz);

module.exports = router;