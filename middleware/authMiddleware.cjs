const { admin, db } = require('../config/firebase.cjs');

// Middleware para verificar el token de Firebase
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Acceso denegado. No se proporcionó token de autenticación o formato inválido.' });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken; // Attach the decoded token to the request object
        next();
    } catch (error) {
        console.error('Error al verificar token de Firebase:', error);
        if (error.code === 'auth/id-token-expired') {
            return res.status(401).json({ message: 'Token de autenticación expirado.', error: error.message });
        }
        res.status(403).json({ message: 'Token de autenticación inválido.', error: error.message });
    }
};

// Middleware para control de acceso basado en roles (rol desde Firestore)
const authorizeRoles = (...allowedRoles) => {
    return async (req, res, next) => {
        if (!req.user || !req.user.uid) {
            return res.status(403).json({ message: 'Acceso denegado. Usuario no autenticado.' });
        }

        try {
            // Buscar el rol del usuario en la colección 'usuarios'
            const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
            if (!userDoc.exists) {
                return res.status(403).json({ message: 'Acceso denegado. Usuario no encontrado en la base de datos.' });
            }
            const userRol = userDoc.data().rol;
            if (!userRol) {
                return res.status(403).json({ message: 'Acceso denegado. Rol de usuario no definido.' });
            }
            if (!allowedRoles.includes(userRol)) {
                return res.status(403).json({ message: `Acceso denegado. Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}.` });
            }
            next();
        } catch (error) {
            console.error('Error al verificar rol de usuario:', error);
            res.status(500).json({ message: 'Error interno al verificar el rol de usuario.', error: error.message });
        }
    };
};

module.exports = { verifyToken, authorizeRoles };