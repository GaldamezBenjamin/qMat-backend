const { admin } = require('../config/firebase.cjs');

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

// Middleware for role-based access control
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.rol) { // Assuming 'rol' is stored in custom claims or fetched later
            // If 'rol' is not in custom claims, you'll need to fetch it from Firestore here
            // For simplicity, we assume 'rol' is part of custom claims or attached during user creation
            return res.status(403).json({ message: 'Acceso denegado. Rol de usuario no definido.' });
        }

        // For this example, we assume 'rol' is a custom claim set in Firebase Auth
        // If not, you'd fetch the user document here:
        // const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
        // const userRol = userDoc.data()?.rol;
        const userRol = req.user.rol; // Assuming 'rol' is directly in custom claims

        if (!allowedRoles.includes(userRol)) {
            return res.status(403).json({ message: `Acceso denegado. Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}.` });
        }
        next();
    };
};

module.exports = { verifyToken, authorizeRoles };