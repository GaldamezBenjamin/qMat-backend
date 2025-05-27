const { db } = require('../../config/firebase.cjs');

const crearEstadisticasUsuario = async (req, res) => {
  try {
    // Validación
    if (!req.body.uid) {
      return res.status(400).send('Se requiere el UID del usuario');
    }

    const nuevasEstadisticas = {
      uid: req.body.uid,
      quizzes_completados: 0,
      resps_por_cat: [],
      tiempo_promedio: 0
    };

    await db.collection('estadisticas').doc(req.body.uid).set(nuevasEstadisticas);
    res.status(201).send(nuevasEstadisticas);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al crear las estadísticas del usuario');
  }
};

const obtenerEstadisticasUsuario = async (req, res) => {
  try {
    const doc = await db.collection('estadisticas').doc(req.params.uid).get();
    if (!doc.exists) {
      return res.status(404).send('Estadísticas del usuario no encontradas');
    }
    res.send(doc.data());
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al obtener las estadísticas del usuario');
  }
};

const actualizarEstadisticasUsuario = async (req, res) => {
  try {
    // Validación (Opcional, dependiendo de qué campos permites actualizar)
    if (req.body.quizzes_completados === undefined || req.body.resps_por_cat === undefined || req.body.tiempo_promedio === undefined) {
      return res.status(400).send('Faltan datos para actualizar las estadísticas');
    }

    const estadisticasActualizadas = {
      quizzes_completados: req.body.quizzes_completados,
      resps_por_cat: req.body.resps_por_cat,
      tiempo_promedio: req.body.tiempo_promedio
    };

    await db.collection('estadisticas').doc(req.params.uid).update(estadisticasActualizadas);
    res.send(estadisticasActualizadas);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al actualizar las estadísticas del usuario');
  }
};

const eliminarEstadisticasUsuario = async (req, res) => {
  try {
    await db.collection('estadisticas').doc(req.params.uid).delete();
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al eliminar las estadísticas del usuario');
  }
};

module.exports = {
  crearEstadisticasUsuario,
  obtenerEstadisticasUsuario,
  actualizarEstadisticasUsuario,
  eliminarEstadisticasUsuario
};