const express = require('express');
const router = express.Router();
const quiz = require('../../controllers/v1/quizCtrl.cjs');

router.post('/', quiz.crearQuiz);
router.get('/', quiz.obtenerQuizzes);
router.get('/:id_quiz', quiz.obtenerQuiz);
router.put('/:id_quiz', quiz.actualizarQuiz);
router.delete('/:id_quiz', quiz.eliminarQuiz);

module.exports = router;