const { db } = require('../config/firebase.cjs');
const { usuarioSchema, intentoQuizSchema } = require('../models/Usuario.cjs'); // Opcional

const crearUsuario = async (req, res) => {
  try {
    // Validación (manual)
    if (!req.body.uid || !req.body.username || !req.body.email || !req.body.rol) {
      return res.status(400).send('Faltan campos obligatorios');
    }

    const nuevoUsuario = {
      uid: req.body.uid,
      username: req.body.username,
      email: req.body.email,
      fecha_registro: Date.now(),
      exp: { actual: 0, anterior: 0 },
      suscripcion: { suscrito: false, fecha_inicio: null, fecha_fin: null },
      rol: req.body.rol
    };

    // **¡IMPORTANTE!** No generes el UID aquí. Firebase Auth lo genera.
    // Si estás creando el usuario a través de Firebase Auth,
    // solo guarda los datos adicionales aquí, no el usuario base.

    await db.collection('usuarios').doc(req.body.uid).set(nuevoUsuario); // Usar .set()
    res.status(201).send(nuevoUsuario);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al crear el usuario');
  }
};

const obtenerUsuarios = async (req, res) => {
  try {
    const snapshot = await db.collection('usuarios').get();
    const usuarios = [];
    snapshot.forEach(doc => {
      usuarios.push({ uid: doc.id, ...doc.data() });
    });
    res.send(usuarios);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al obtener los usuarios');
  }
};

const obtenerUsuario = async (req, res) => {
  try {
    const doc = await db.collection('usuarios').doc(req.params.uid).get();
    if (!doc.exists) {
      return res.status(404).send('Usuario no encontrado');
    }
    res.send({ uid: doc.id, ...doc.data() });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al obtener el usuario');
  }
};

const actualizarUsuario = async (req, res) => {
  try {
    // Validación (manual)
    if (!req.body.username || !req.body.email || !req.body.rol) { // password opcional en update
      return res.status(400).send('Faltan campos obligatorios');
    }

    const usuarioActualizado = {
      username: req.body.username,
      email: req.body.email,
      rol: req.body.rol,
      exp: req.body.exp,
      suscripcion: req.body.suscripcion
    };

    if (req.body.password) {
      usuarioActualizado.password = req.body.password; // **¡CUIDADO!** Hashear
    }

    await db.collection('usuarios').doc(req.params.uid).update(usuarioActualizado);
    res.send({ uid: req.params.uid, ...usuarioActualizado });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al actualizar el usuario');
  }
};

const eliminarUsuario = async (req, res) => {
  try {
    await db.collection('usuarios').doc(req.params.uid).delete();
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al eliminar el usuario');
  }
};

// **CRUD para Intentos_Quiz (Subcolección)**

const crearIntentoQuiz = async (req, res) => {
  try {
    // Validación
    if (!req.body.id_quiz || !req.body.fecha_inicio || !req.body.fecha_fin || !req.body.respuestas_usuario) {
      return res.status(400).send('Faltan datos del intento de quiz');
    }

    const nuevoIntento = {
      id_quiz: req.body.id_quiz,
      fecha_inicio: req.body.fecha_inicio,
      fecha_fin: req.body.fecha_fin,
      respuestas_usuario: req.body.respuestas_usuario
    };

    const docRef = await db.collection('usuarios').doc(req.params.uid).collection('intentos_quiz').add(nuevoIntento);
    res.status(201).send({ id_intento: docRef.id, ...nuevoIntento });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al guardar el intento de quiz');
  }
};

const obtenerIntentosQuiz = async (req, res) => {
  try {
    const snapshot = await db.collection('usuarios').doc(req.params.uid).collection('intentos_quiz').get();
    const intentos = [];
    snapshot.forEach(doc => {
      intentos.push({ id_intento: doc.id, ...doc.data() });
    });
    res.send(intentos);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al obtener los intentos de quiz');
  }
};

const obtenerIntentoQuiz = async (req, res) => {
  try {
    const doc = await db.collection('usuarios')
      .doc(req.params.uid)
      .collection('intentos_quiz')
      .doc(req.params.id_intento)
      .get();

    if (!doc.exists) {
      return res.status(404).send('Intento de quiz no encontrado');
    }
    res.send({ id_intento: doc.id, ...doc.data() });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al obtener el intento de quiz');
  }
};

const actualizarIntentoQuiz = async (req, res) => {
  try {
    // Validación
    if (!req.body.id_quiz || !req.body.fecha_inicio || !req.body.fecha_fin || !req.body.respuestas_usuario) {
      return res.status(400).send('Faltan datos del intento de quiz');
    }

    const intentoActualizado = {
      id_quiz: req.body.id_quiz,
      fecha_inicio: req.body.fecha_inicio,
      fecha_fin: req.body.fecha_fin,
      respuestas_usuario: req.body.respuestas_usuario
    };

    await db.collection('usuarios')
      .doc(req.params.uid)
      .collection('intentos_quiz')
      .doc(req.params.id_intento)
      .update(intentoActualizado);

    res.send({ id_intento: req.params.id_intento, ...intentoActualizado });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al actualizar el intento de quiz');
  }
};

const eliminarIntentoQuiz = async (req, res) => {
  try {
    await db.collection('usuarios')
      .doc(req.params.uid)
      .collection('intentos_quiz')
      .doc(req.params.id_intento)
      .delete();

    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al eliminar el intento de quiz');
  }
};

module.exports = {
  crearUsuario,
  obtenerUsuarios,
  obtenerUsuario,
  actualizarUsuario,
  eliminarUsuario,
  crearIntentoQuiz,
  obtenerIntentosQuiz,
  obtenerIntentoQuiz,
  actualizarIntentoQuiz,
  eliminarIntentoQuiz
};