const { db } = require('../config/firebase.cjs');

const crearCategoria = async (req, res) => {
  try {
    // Validación
    if (!req.body.nombre || !req.body.descripcion) {
      return res.status(400).send('Faltan datos de la categoría');
    }

    const nuevaCategoria = {
      nombre: req.body.nombre,
      descripcion: req.body.descripcion
    };

    const docRef = await db.collection('categorias').add(nuevaCategoria);
    res.status(201).send({ id_categoria: docRef.id, ...nuevaCategoria });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al crear la categoría');
  }
};

const obtenerCategorias = async (req, res) => {
  try {
    const snapshot = await db.collection('categorias').get();
    const categorias = [];
    snapshot.forEach(doc => {
      categorias.push({ id_categoria: doc.id, ...doc.data() });
    });
    res.send(categorias);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al obtener las categorías');
  }
};

const obtenerCategoria = async (req, res) => {
  try {
    const doc = await db.collection('categorias').doc(req.params.id_categoria).get();
    if (!doc.exists) {
      return res.status(404).send('Categoría no encontrada');
    }
    res.send({ id_categoria: doc.id, ...doc.data() });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al obtener la categoría');
  }
};

const actualizarCategoria = async (req, res) => {
  try {
    // Validación
    if (!req.body.nombre || !req.body.descripcion) {
      return res.status(400).send('Faltan datos para actualizar la categoría');
    }

    const categoriaActualizada = {
      nombre: req.body.nombre,
      descripcion: req.body.descripcion
    };

    await db.collection('categorias').doc(req.params.id_categoria).update(categoriaActualizada);
    res.send({ id_categoria: req.params.id_categoria, ...categoriaActualizada });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al actualizar la categoría');
  }
};

const eliminarCategoria = async (req, res) => {
  try {
    await db.collection('categorias').doc(req.params.id_categoria).delete();
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al eliminar la categoría');
  }
};

module.exports = {
  crearCategoria,
  obtenerCategorias,
  obtenerCategoria,
  actualizarCategoria,
  eliminarCategoria
};