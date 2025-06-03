const { db, admin } = require('../config/firebase.cjs');
const {
    createUserSchema,
    updateUserSchema,
    updateSubscriptionSchema,
    updateExperienceSchema
} = require('../schemas/usuarioSchemas.cjs');
const { z } = require('zod'); // Import z for ZodError handling


// Get all users
// Only accessible by admin
exports.getAllUsers = async (req, res) => {
    try {
        const usersRef = db.collection('usuarios');
        const snapshot = await usersRef.get();

        if (snapshot.empty) {
            return res.status(404).json({ message: 'No se encontraron usuarios.' });
        }

        const users = [];
        snapshot.forEach(doc => {
            const userData = doc.data();
            // Remove sensitive data like password if it were accidentally stored
            delete userData.password;
            users.push({
                id: doc.id, // The document ID (Firebase UID)
                ...userData
            });
        });
        res.status(200).json(users);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Get user by UID
exports.getUserByUid = async (req, res) => {
    try {
        const { uid } = req.params;

        // Ensure a user can only request their own data, unless they are an admin
        if (req.user.uid !== uid && req.user.rol !== 'admin') {
            return res.status(403).json({ message: 'Acceso denegado. No tienes permisos para ver este perfil.' });
        }

        const userRef = db.collection('usuarios').doc(uid);
        const doc = await userRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: `Usuario con UID ${uid} no encontrado.` });
        }

        const userData = doc.data();
        delete userData.password; // Remove sensitive data
        res.status(200).json({ id: doc.id, ...userData });
    } catch (error) {
        console.error(`Error al obtener usuario con UID ${req.params.uid}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Create a new user profile (after Firebase Auth registration)
// This endpoint assumes the user has already registered via Firebase Auth
// and their ID token provides the UID.
exports.createUserProfile = async (req, res) => {
    try {
        const uid = req.user.uid; // Get UID from the authenticated token
        const { username, email, rol } = req.body; // Password is not here

        // Validate request body with Zod
        const validatedData = createUserSchema.parse({ username, email, rol });

        const userRef = db.collection('usuarios').doc(uid);
        const doc = await userRef.get();

        if (doc.exists) {
            return res.status(409).json({ message: `El perfil de usuario con UID ${uid} ya existe.` });
        }

        const newUserProfile = {
            username: validatedData.username,
            email: validatedData.email,
            fecha_registro: admin.firestore.Timestamp.now(),
            rol: validatedData.rol,
            exp: {
                actual: 0,
                anterior: 0
            },
            suscripcion: {
                suscrito: false,
                fecha_inicio: null,
                fecha_fin: null
            }
        };

        await userRef.set(newUserProfile);

        // Optionally, update Firebase Auth custom claims with the role
        // This is important if you want to use `req.user.rol` directly in middleware
        await admin.auth().setCustomUserClaims(uid, { rol: validatedData.rol });


        res.status(201).json({ message: 'Perfil de usuario creado exitosamente.', userId: uid, user: newUserProfile });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Datos de entrada inválidos.', errors: error.errors });
        }
        console.error('Error al crear perfil de usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Update an existing user's profile
exports.updateUser = async (req, res) => {
    try {
        const { uid } = req.params;
        const updates = req.body;

        // A user can only update their own profile, unless they are an admin
        if (req.user.uid !== uid && req.user.rol !== 'admin') {
            return res.status(403).json({ message: 'Acceso denegado. No tienes permisos para actualizar este perfil.' });
        }

        // Validate request body with Zod
        const validatedUpdates = updateUserSchema.parse(updates);

        // Admins can change roles, but regular users cannot.
        // If a non-admin tries to change 'rol', remove it from updates.
        if (req.user.rol !== 'admin' && validatedUpdates.rol) {
            delete validatedUpdates.rol;
            console.warn(`Usuario ${req.user.uid} intentó cambiar el rol de ${uid}. Acción denegada.`);
        }

        const userRef = db.collection('usuarios').doc(uid);
        const doc = await userRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: `Usuario con UID ${uid} no encontrado.` });
        }

        await userRef.update(validatedUpdates);
        res.status(200).json({ message: 'Perfil de usuario actualizado exitosamente.' });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Datos de entrada inválidos.', errors: error.errors });
        }
        console.error(`Error al actualizar usuario con UID ${req.params.uid}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Delete a user
// Only accessible by admin
exports.deleteUser = async (req, res) => {
    try {
        const { uid } = req.params;

        // Admins should not be able to delete themselves via this endpoint (optional security measure)
        if (req.user.uid === uid) {
            return res.status(403).json({ message: 'No puedes eliminar tu propia cuenta a través de este endpoint. Utiliza la funcionalidad de Firebase Auth.' });
        }

        const userRef = db.collection('usuarios').doc(uid);
        const doc = await userRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: `Usuario con UID ${uid} no encontrado.` });
        }

        // Also delete the user from Firebase Authentication
        await admin.auth().deleteUser(uid);

        await userRef.delete();
        res.status(200).json({ message: 'Usuario eliminado exitosamente (Firestore y Authentication).' });
    } catch (error) {
        console.error(`Error al eliminar usuario con UID ${req.params.uid}:`, error);
        if (error.code === 'auth/user-not-found') {
            return res.status(404).json({ message: 'Usuario de Firebase Auth no encontrado.', error: error.message });
        }
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Update user's subscription status
exports.updateSubscription = async (req, res) => {
    try {
        const { uid } = req.params;
        const { suscrito, fecha_inicio, fecha_fin } = req.body;

        // A user can only update their own subscription, unless they are an admin
        if (req.user.uid !== uid && req.user.rol !== 'admin') {
            return res.status(403).json({ message: 'Acceso denegado. No tienes permisos para actualizar esta suscripción.' });
        }

        // Validate request body with Zod
        const validatedData = updateSubscriptionSchema.parse({ suscrito, fecha_inicio, fecha_fin });

        const userRef = db.collection('usuarios').doc(uid);
        const doc = await userRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: `Usuario con UID ${uid} no encontrado.` });
        }

        const subscriptionUpdates = {
            'suscripcion.suscrito': validatedData.suscrito,
            'suscripcion.fecha_inicio': validatedData.fecha_inicio ? admin.firestore.Timestamp.fromDate(new Date(validatedData.fecha_inicio)) : null,
            'suscripcion.fecha_fin': validatedData.fecha_fin ? admin.firestore.Timestamp.fromDate(new Date(validatedData.fecha_fin)) : null,
        };

        await userRef.update(subscriptionUpdates);
        res.status(200).json({ message: 'Estado de suscripción actualizado exitosamente.' });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Datos de entrada inválidos.', errors: error.errors });
        }
        console.error(`Error al actualizar suscripción para usuario con UID ${req.params.uid}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Update user's experience points
exports.updateExperience = async (req, res) => {
    try {
        const { uid } = req.params;
        const { actual, anterior } = req.body;

        // A user can only update their own experience, unless they are an admin
        if (req.user.uid !== uid && req.user.rol !== 'admin') {
            return res.status(403).json({ message: 'Acceso denegado. No tienes permisos para actualizar la experiencia de este usuario.' });
        }

        // Validate request body with Zod
        const validatedData = updateExperienceSchema.parse({ actual, anterior });

        const userRef = db.collection('usuarios').doc(uid);
        const doc = await userRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: `Usuario con UID ${uid} no encontrado.` });
        }

        const experienceUpdates = {
            'exp.actual': validatedData.actual,
            'exp.anterior': validatedData.anterior,
        };

        await userRef.update(experienceUpdates);
        res.status(200).json({ message: 'Puntos de experiencia actualizados exitosamente.' });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Datos de entrada inválidos.', errors: error.errors });
        }
        console.error(`Error al actualizar experiencia para usuario con UID ${req.params.uid}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};