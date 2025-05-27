const { auth } = require('../config/firebase.cjs');

const requireAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      return res.status(401).send('Se requiere autenticación');
    }

    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Obtener el usuario de la base de datos para verificar el rol
    const userDoc = await db.collection('Usuarios').doc(uid).get();
    if (!userDoc.exists || userDoc.data().rol !== 'administrador') {
      return res.status(403).send('No tienes permiso para realizar esta acción');
    }

    req.uid = uid; // Opcional: pasar el UID a las rutas
    next();
  } catch (error) {
    console.error(error);
    return res.status(401).send('Token inválido');
  }
};

module.exports = { requireAdmin };