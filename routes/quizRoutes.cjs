const express = require('express');
const router = express.Router();
const QuizController = require('../controllers/QuizController.cjs');

router.post('/', QuizController.crearQuiz);
router.get('/', QuizController.obtenerQuizzes);
router.get('/:id_quiz', QuizController.obtenerQuiz);
router.put('/:id_quiz', QuizController.actualizarQuiz);
router.delete('/:id_quiz', QuizController.eliminarQuiz);

module.exports = router;