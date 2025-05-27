const { db } = require('../../config/firebase.cjs');

const crearSuperCategoria = async (req, res) => {
  try {
    if (!req.body.nombre || !req.body.paes) {
      return res.status(400).send('Faltan datos de la super categoría');
    }

    const nuevaSuperCategoria = {
      nombre: req.body.nombre,
      paes: req.body.paes,
      categorias: req.body.categorias || [],
    };

    const docRef = await db.collection('super_categorias').add(nuevaSuperCategoria);
    res.status(201).send({ id_super_cat: docRef.id, ...nuevaSuperCategoria });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al crear la super categoría');
  }
};

const obtenerSuperCategorias = async (req, res) => {
  try {
    const snapshot = await db.collection('super_categorias').get();
    const superCategorias = [];
    snapshot.forEach(doc => {
      superCategorias.push({ id_super_cat: doc.id, ...doc.data() });
    });
    res.send(superCategorias);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al obtener las super categorías');
  }
};

const obtenerSuperCategoria = async (req, res) => {
  try {
    const doc = await db.collection('super_categorias').doc(req.params.id_super_cat).get();
    if (!doc.exists) {
      return res.status(404).send('Super categoría no encontrada');
    }
    res.send({ id_super_cat: doc.id, ...doc.data() });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al obtener la super categoría');
  }
};

const actualizarSuperCategoria = async (req, res) => {
   try {
    if (!req.body.nombre || !req.body.paes) {
      return res.status(400).send('Faltan datos para actualizar la super categoría (nombre y paes son obligatorios)');
    }
    
    const superCategoriaActualizada = {
      nombre: req.body.nombre,
      paes: req.body.paes,
      categorias: req.body.categorias || [],
    };

    await db.collection('super_categorias').doc(req.params.id_super_cat).update(superCategoriaActualizada);
    res.send({ id_super_cat: req.params.id_super_cat, ...superCategoriaActualizada });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al actualizar la super categoría');
  }
};

const eliminarSuperCategoria = async (req, res) => {
  try {
    await db.collection('super_categorias').doc(req.params.id_super_cat).delete();
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al eliminar la super categoría');
  }
};

module.exports = {
  crearSuperCategoria,
  obtenerSuperCategorias,
  obtenerSuperCategoria,
  actualizarSuperCategoria,
  eliminarSuperCategoria
};