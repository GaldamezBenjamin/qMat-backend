const { db } = require('../../config/firebase.cjs');

const crearQuiz = async (req, res) => {
  try {
    // Validación
    if (!req.body.nombre || !req.body.dificultad || !req.body.cantidad_preguntas || !req.body.tiempo_estimado || !req.body.preguntas) {
      return res.status(400).send('Faltan datos del quiz');
    }

    const nuevoQuiz = {
      nombre: req.body.nombre,
      dificultad: req.body.dificultad,
      cantidad_preguntas: req.body.cantidad_preguntas,
      tiempo_estimado: req.body.tiempo_estimado,
      preguntas: req.body.preguntas // Array de IDs de preguntas
    };

    const docRef = await db.collection('quizzes').add(nuevoQuiz);
    res.status(201).send({ id_quiz: docRef.id, ...nuevoQuiz });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al crear el quiz');
  }
};

const obtenerQuizzes = async (req, res) => {
  try {
    const snapshot = await db.collection('quizzes').get();
    const quizzes = [];
    snapshot.forEach(doc => {
      quizzes.push({ id_quiz: doc.id, ...doc.data() });
    });
    res.send(quizzes);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al obtener los quizzes');
  }
};

const obtenerQuiz = async (req, res) => {
  try {
    const doc = await db.collection('quizzes').doc(req.params.id_quiz).get();
    if (!doc.exists) {
      return res.status(404).send('Quiz no encontrado');
    }
    res.send({ id_quiz: doc.id, ...doc.data() });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al obtener el quiz');
  }
};

const actualizarQuiz = async (req, res) => {
  try {
    // Validación
    if (!req.body.nombre || !req.body.dificultad || !req.body.cantidad_preguntas || !req.body.tiempo_estimado || !req.body.preguntas) {
      return res.status(400).send('Faltan datos para actualizar el quiz');
    }

    const quizActualizado = {
      nombre: req.body.nombre,
      dificultad: req.body.dificultad,
      cantidad_preguntas: req.body.cantidad_preguntas,
      tiempo_estimado: req.body.tiempo_estimado,
      preguntas: req.body.preguntas
    };

    await db.collection('quizzes').doc(req.params.id_quiz).update(quizActualizado);
    res.send({ id_quiz: req.params.id_quiz, ...quizActualizado });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al actualizar el quiz');
  }
};

const eliminarQuiz = async (req, res) => {
  try {
    await db.collection('quizzes').doc(req.params.id_quiz).delete();
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al eliminar el quiz');
  }
};

module.exports = {
  crearQuiz,
  obtenerQuizzes,
  obtenerQuiz,
  actualizarQuiz,
  eliminarQuiz
};