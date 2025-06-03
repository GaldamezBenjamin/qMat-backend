const express = require('express');
const router = express.Router();
const quizAttemptController = require('../controllers/intentoQuizCtrl.cjs');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware.cjs');

// Apply verifyToken middleware to all quiz attempt routes
router.use(verifyToken);

// Get all quiz attempts (Admin only)
router.get('/', authorizeRoles('admin'), quizAttemptController.getAllQuizAttempts);

// Get quiz attempts by user UID (User can get their own, Admin can get any)
router.get('/user/:uid', quizAttemptController.getQuizAttemptsByUid);

// Get a single quiz attempt by ID (User can get their own, Admin can get any)
router.get('/:id_intento', quizAttemptController.getQuizAttemptById);

// Start a new quiz attempt (Any authenticated user)
router.post('/start', quizAttemptController.startQuizAttempt);

// Submit quiz results for an attempt (User updates their own, Admin can update any)
router.put('/:id_intento/submit', quizAttemptController.submitQuizResults);

// Delete a quiz attempt (Admin only)
router.delete('/:id_intento', authorizeRoles('admin'), quizAttemptController.deleteQuizAttempt);

module.exports = router;