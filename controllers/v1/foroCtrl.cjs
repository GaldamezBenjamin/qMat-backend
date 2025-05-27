const { db } = require('../../config/firebase.cjs');

const crearForo = async (req, res) => {
  try {
    // Validación
    if (!req.body.titulo || !req.body.descripcion || !req.body.creador_uid) {
      return res.status(400).send('Faltan datos del foro');
    }

    const nuevoForo = {
      titulo: req.body.titulo,
      descripcion: req.body.descripcion,
      fecha_creacion: Date.now(),
      creador_uid: req.body.creador_uid
    };

    const docRef = await db.collection('foros').add(nuevoForo);
    res.status(201).send({ id_foro: docRef.id, ...nuevoForo });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al crear el foro');
  }
};

const obtenerForos = async (req, res) => {
  try {
    const snapshot = await db.collection('foros').get();
    const foros = [];
    snapshot.forEach(doc => {
      foros.push({ id_foro: doc.id, ...doc.data() });
    });
    res.send(foros);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al obtener los foros');
  }
};

const obtenerForo = async (req, res) => {
  try {
    const doc = await db.collection('foros').doc(req.params.id_foro).get();
    if (!doc.exists) {
      return res.status(404).send('Foro no encontrado');
    }
    res.send({ id_foro: doc.id, ...doc.data() });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al obtener el foro');
  }
};

const actualizarForo = async (req, res) => {
  try {
    // Validación
    if (!req.body.titulo || !req.body.descripcion) {
      return res.status(400).send('Faltan datos para actualizar el foro');
    }

    const foroActualizado = {
      titulo: req.body.titulo,
      descripcion: req.body.descripcion
    };

    await db.collection('foros').doc(req.params.id_foro).update(foroActualizado);
    res.send({ id_foro: req.params.id_foro, ...foroActualizado });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al actualizar el foro');
  }
};

const eliminarForo = async (req, res) => {
  try {
    await db.collection('foros').doc(req.params.id_foro).delete();
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al eliminar el foro');
  }
};

// CRUD para Mensajes_Foro (Subcolección)

const crearMensajeForo = async (req, res) => {
  try {
    // Validación
    if (!req.body.contenido || !req.body.autor_uid) {
      return res.status(400).send('Faltan datos del mensaje');
    }

    const nuevoMensaje = {
      contenido: req.body.contenido,
      fecha_creacion: Date.now(),
      autor_uid: req.body.autor_uid,
      foro_id: req.params.id_foro  // Incluir foro_id (redundante pero útil)
    };

    const docRef = await db.collection('foros').doc(req.params.id_foro).collection('mensajes_foro').add(nuevoMensaje);
    res.status(201).send({ id_mensaje: docRef.id, ...nuevoMensaje });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al crear el mensaje');
  }
};

const obtenerMensajesForo = async (req, res) => {
  try {
    const snapshot = await db.collection('foros').doc(req.params.id_foro).collection('mensajes_foro').get();
    const mensajes = [];
    snapshot.forEach(doc => {
      mensajes.push({ id_mensaje: doc.id, ...doc.data() });
    });
    res.send(mensajes);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al obtener los mensajes');
  }
};

const obtenerMensajeForo = async (req, res) => {
  try {
    const doc = await db.collection('foros')
      .doc(req.params.id_foro)
      .collection('mensajes_foro')
      .doc(req.params.id_mensaje)
      .get();

    if (!doc.exists) {
      return res.status(404).send('Mensaje no encontrado');
    }
    res.send({ id_mensaje: doc.id, ...doc.data() });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al obtener el mensaje');
  }
};

const actualizarMensajeForo = async (req, res) => {
  try {
    // Validación
    if (!req.body.contenido) {
      return res.status(400).send('Faltan datos para actualizar el mensaje');
    }

    const mensajeActualizado = {
      contenido: req.body.contenido
    };

    await db.collection('foros')
      .doc(req.params.id_foro)
      .collection('mensajes_foro')
      .doc(req.params.id_mensaje)
      .update(mensajeActualizado);

    res.send({ id_mensaje: req.params.id_mensaje, ...mensajeActualizado });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al actualizar el mensaje');
  }
};

const eliminarMensajeForo = async (req, res) => {
  try {
    await db.collection('foros')
      .doc(req.params.id_foro)
      .collection('mensajes_foro')
      .doc(req.params.id_mensaje)
      .delete();

    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al eliminar el mensaje');
  }
};

module.exports = {
  crearForo,
  obtenerForos,
  obtenerForo,
  actualizarForo,
  eliminarForo,
  crearMensajeForo,
  obtenerMensajesForo,
  obtenerMensajeForo,
  actualizarMensajeForo,
  eliminarMensajeForo
};