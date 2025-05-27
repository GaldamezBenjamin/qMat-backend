const { db } = require('../../config/firebase.cjs');
const { preguntaSchema } = require('../../models/Pregunta.cjs');

// CREAR PREGUNTA
const crearPregunta = async (req, res) => {
  try {
    if (!req.body.enunciado || !req.body.dificultad || !req.body.opciones || !req.body.id_categoria) {
      return res.status(400).send('Faltan campos obligatorios');
    }

    const nuevaPregunta = {
      enunciado: req.body.enunciado,
      dificultad: req.body.dificultad,
      opciones: req.body.opciones,
      id_categoria: req.body.id_categoria
    };

    const docRef = await db.collection('preguntas').add(nuevaPregunta);
    res.status(201).send({ id: docRef.id, ...nuevaPregunta }); // Devuelve la ID generada
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al crear la pregunta');
  }
};

// OBTENER PREGUNTAS
const obtenerPreguntas = async (req, res) => {
  try {
    const snapshot = await db.collection('preguntas').get();
    const preguntas = [];
    snapshot.forEach(doc => {
      preguntas.push({ id: doc.id, ...doc.data() });
    });
    res.send(preguntas);
  } catch (error) {
    res.status(500).send('Error al obtener las preguntas');
  }
};

// OBTENER PREGUNTA
const obtenerPregunta = async (req, res) => {
  try {
    const preguntaId = req.params.id;
    const doc = await db.collection('preguntas').doc(preguntaId).get();
    if (!doc.exists) {
      return res.status(404).send('Pregunta no encontrada');
    }
    res.send({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).send('Error al obtener la pregunta');
  }
};

// ACTUALIZAR PREGUNTA
const actualizarPregunta = async (req, res) => {
  try {
    // Validación (igual que en Crear)
    if (!req.body.enunciado || !req.body.dificultad || !req.body.opciones || !req.body.id_categoria) {
      return res.status(400).send('Faltan campos obligatorios');
    }

    const preguntaActualizada = {
      enunciado: req.body.enunciado,
      dificultad: req.body.dificultad,
      opciones: req.body.opciones,
      id_categoria: req.body.id_categoria
    };

    await db.collection('preguntas').doc(req.params.id).update(preguntaActualizada);
    res.send({ id: req.params.id, ...preguntaActualizada });
  } catch (error) {
    res.status(500).send('Error al actualizar la pregunta');
  }
};

// ELIMINAR PREGUNTA
const eliminarPregunta = async (req, res) => {
  try {
    await db.collection('preguntas').doc(req.params.id).delete();
    res.status(204).send(); // 204 No Content (éxito, pero sin contenido para enviar)
  } catch (error) {
    res.status(500).send('Error al eliminar la pregunta');
  }
};

module.exports = { crearPregunta, obtenerPreguntas, obtenerPregunta, actualizarPregunta, eliminarPregunta }