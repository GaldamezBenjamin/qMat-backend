const { db, admin } = require('../config/firebase.cjs');
const { createStatisticSchema, updateStatisticSchema, updateSubCategoryStatsSchema } = require('../schemas/estadisticaSchemas.cjs');
const { z } = require('zod');

// Get all statistics (Admin only)
exports.getAllStatistics = async (req, res) => {
    try {
        const statsRef = db.collection('estadisticas');
        const snapshot = await statsRef.get();

        if (snapshot.empty) {
            return res.status(404).json({ message: 'No se encontraron estadísticas.' });
        }

        const statistics = [];
        snapshot.forEach(doc => {
            statistics.push({
                uid: doc.id, // UID is the document ID for statistics
                ...doc.data()
            });
        });
        res.status(200).json(statistics);
    } catch (error) {
        console.error('Error al obtener todas las estadísticas:', error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Get statistics for a specific user (User can get their own, Admin can get any)
exports.getStatisticByUid = async (req, res) => {
    try {
        const { uid } = req.params;
        const requester_uid = req.user.uid;
        const requester_rol = req.user.rol;

        // Authorization check: User can only get their own stats unless they are an admin
        if (uid !== requester_uid && requester_rol !== 'admin') {
            return res.status(403).json({ message: 'Acceso denegado. Solo puedes ver tus propias estadísticas.' });
        }

        const statRef = db.collection('estadisticas').doc(uid);
        const doc = await statRef.get();

        if (!doc.exists) {
            // If no stats exist, create a default entry for the user
            const defaultStats = createStatisticSchema.parse({}); // Zod defaults will apply
            await statRef.set(defaultStats);
            return res.status(200).json({ uid: doc.id, ...defaultStats, message: 'Estadísticas predeterminadas creadas.' });
        }

        res.status(200).json({ uid: doc.id, ...doc.data() });
    } catch (error) {
        console.error(`Error al obtener estadísticas para UID ${req.params.uid}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Create or initialize statistics for a user (Typically called once per user)
// This endpoint might be used internally or when a user first interacts with quizzes
exports.createStatistic = async (req, res) => {
    try {
        const user_uid = req.user.uid; // UID from authenticated token
        const requester_rol = req.user.rol;

        // Only allow admin to create for other UIDs, or user for themselves.
        // For simplicity, we'll assume this is for the *authenticated user* initially.
        // If an admin wants to create for another user, they'd use the update endpoint.

        const statRef = db.collection('estadisticas').doc(user_uid);
        const doc = await statRef.get();

        if (doc.exists) {
            return res.status(409).json({ message: `Las estadísticas para el usuario ${user_uid} ya existen. Use PUT para actualizar.` });
        }

        const validatedData = createStatisticSchema.parse(req.body); // Validate provided data, apply defaults

        await statRef.set(validatedData);
        res.status(201).json({ message: 'Estadísticas creadas exitosamente.', uid: user_uid, stats: validatedData });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Datos de entrada inválidos.', errors: error.errors });
        }
        console.error('Error al crear estadísticas:', error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};


// Update statistics for a user (User can update their own, Admin can update any)
exports.updateStatistic = async (req, res) => {
    try {
        const { uid } = req.params;
        const updates = req.body;
        const requester_uid = req.user.uid;
        const requester_rol = req.user.rol;

        // Authorization check: User can only update their own stats unless they are an admin
        if (uid !== requester_uid && requester_rol !== 'admin') {
            return res.status(403).json({ message: 'Acceso denegado. Solo puedes actualizar tus propias estadísticas.' });
        }

        const validatedUpdates = updateStatisticSchema.parse(updates);

        const statRef = db.collection('estadisticas').doc(uid);
        const doc = await statRef.get();

        if (!doc.exists) {
            // If stats don't exist, create a default entry before updating
            const defaultStats = createStatisticSchema.parse({});
            await statRef.set(defaultStats); // Initialize with defaults
        }

        await statRef.update(validatedUpdates);
        res.status(200).json({ message: 'Estadísticas actualizadas exitosamente.' });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Datos de entrada inválidos.', errors: error.errors });
        }
        console.error(`Error al actualizar estadísticas para UID ${req.params.uid}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Atomically update specific subcategory statistics (PATCH for a specific subcategory)
// This is typically how quiz results would update user stats
exports.updateSubCategoryStats = async (req, res) => {
    try {
        const { uid } = req.params;
        const { id_subcategoria, correctas, incorrectas } = req.body;
        const requester_uid = req.user.uid;
        const requester_rol = req.user.rol;

        // Authorization check
        if (uid !== requester_uid && requester_rol !== 'admin') {
            return res.status(403).json({ message: 'Acceso denegado. Solo puedes actualizar tus propias estadísticas de subcategoría.' });
        }

        // Validate input for the subcategory update
        const validatedUpdate = updateSubCategoryStatsSchema.parse({ id_subcategoria, correctas, incorrectas });

        const statRef = db.collection('estadisticas').doc(uid);
        const statDoc = await statRef.get();

        let currentStats;
        if (!statDoc.exists) {
            // If no stats exist, initialize with defaults
            currentStats = createStatisticSchema.parse({});
            await statRef.set(currentStats);
        } else {
            currentStats = statDoc.data();
        }

        // Ensure 'respuestas_por_categoria' array exists
        let respuestasPorCategoria = Array.isArray(currentStats.respuestas_por_categoria)
            ? currentStats.respuestas_por_categoria
            : [];

        // Find existing entry for the subcategory
        const existingIndex = respuestasPorCategoria.findIndex(
            (item) => item.id_subcategoria === validatedUpdate.id_subcategoria
        );

        if (existingIndex > -1) {
            // Update existing entry
            const existingEntry = respuestasPorCategoria[existingIndex];
            if (validatedUpdate.correctas !== undefined) {
                existingEntry.correctas = (existingEntry.correctas || 0) + validatedUpdate.correctas;
            }
            if (validatedUpdate.incorrectas !== undefined) {
                existingEntry.incorrectas = (existingEntry.incorrectas || 0) + validatedUpdate.incorrectas;
            }
            respuestasPorCategoria[existingIndex] = existingEntry; // Update the array element
        } else {
            // Add new entry
            respuestasPorCategoria.push({
                id_subcategoria: validatedUpdate.id_subcategoria,
                correctas: validatedUpdate.correctas || 0,
                incorrectas: validatedUpdate.incorrectas || 0,
            });
        }

        // Update quizzes_completados and tiempo_promedio if needed, or assume this endpoint only updates subcategory stats
        // For atomic quiz result update, you might increment quizzes_completados here too.
        // Example: If each call means one quiz completion, then:
        // await statRef.update({
        //     respuestas_por_categoria: respuestasPorCategoria,
        //     quizzes_completados: admin.firestore.FieldValue.increment(1)
        // });
        // For now, we'll just update the array.

        await statRef.update({
            respuestas_por_categoria: respuestasPorCategoria,
            // You might want to update quizzes_completados and tiempo_promedio here as well based on quiz outcome
            // e.g., quizzes_completados: admin.firestore.FieldValue.increment(1)
            // Or leave it to the separate PUT / PATCH /stats/:uid endpoint if these are aggregated differently.
        });

        res.status(200).json({ message: 'Estadísticas de subcategoría actualizadas exitosamente.' });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Datos de entrada inválidos.', errors: error.errors });
        }
        console.error(`Error al actualizar estadísticas de subcategoría para UID ${req.params.uid}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};


// Delete statistics for a user (Admin only)
exports.deleteStatistic = async (req, res) => {
    try {
        const { uid } = req.params;
        const statRef = db.collection('estadisticas').doc(uid);
        const doc = await statRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: `Estadísticas para UID ${uid} no encontradas.` });
        }

        await statRef.delete();
        res.status(200).json({ message: 'Estadísticas eliminadas exitosamente.' });
    } catch (error) {
        console.error(`Error al eliminar estadísticas para UID ${req.params.uid}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};