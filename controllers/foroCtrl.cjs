const { db, admin } = require('../config/firebase.cjs');
const { createForumSchema, updateForumSchema } = require('../schemas/forosSchemas.cjs');
const { z } = require('zod');

// Get all forums
exports.getAllForums = async (req, res) => {
    try {
        const forumsRef = db.collection('foros');
        const snapshot = await forumsRef.get();

        if (snapshot.empty) {
            return res.status(404).json({ message: 'No se encontraron foros.' });
        }

        const forums = [];
        snapshot.forEach(doc => {
            forums.push({
                id_foro: doc.id,
                ...doc.data()
            });
        });
        res.status(200).json(forums);
    } catch (error) {
        console.error('Error al obtener foros:', error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Get forum by ID
exports.getForumById = async (req, res) => {
    try {
        const { id_foro } = req.params;
        const forumRef = db.collection('foros').doc(id_foro);
        const doc = await forumRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: `Foro con ID ${id_foro} no encontrado.` });
        }

        res.status(200).json({ id_foro: doc.id, ...doc.data() });
    } catch (error) {
        console.error(`Error al obtener foro con ID ${req.params.id_foro}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Create a new forum
// Any authenticated user can create a forum
exports.createForum = async (req, res) => {
    try {
        const { titulo, descripcion } = req.body;
        const creador_uid = req.user.uid; // Get UID from the authenticated token

        // Validate request body with Zod
        const validatedData = createForumSchema.parse({ titulo, descripcion });

        const newForum = {
            titulo: validatedData.titulo,
            descripcion: validatedData.descripcion,
            fecha_creacion: admin.firestore.Timestamp.now(),
            creador_uid: creador_uid
        };

        const newForumRef = db.collection('foros').doc(); // Auto-generate ID
        await newForumRef.set(newForum);

        res.status(201).json({ message: 'Foro creado exitosamente.', id_foro: newForumRef.id, forum: newForum });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Datos de entrada inválidos.', errors: error.errors });
        }
        console.error('Error al crear foro:', error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Update an existing forum
// Only the creator or an admin can update a forum
exports.updateForum = async (req, res) => {
    try {
        const { id_foro } = req.params;
        const updates = req.body;
        const requester_uid = req.user.uid;
        const requester_rol = req.user.rol; // Assuming 'rol' is in custom claims

        // Validate request body with Zod
        const validatedUpdates = updateForumSchema.parse(updates);

        const forumRef = db.collection('foros').doc(id_foro);
        const doc = await forumRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: `Foro con ID ${id_foro} no encontrado.` });
        }

        const forumData = doc.data();

        // Authorization check: Only creator or admin can update
        if (forumData.creador_uid !== requester_uid && requester_rol !== 'admin') {
            return res.status(403).json({ message: 'Acceso denegado. Solo el creador o un administrador pueden actualizar este foro.' });
        }

        await forumRef.update(validatedUpdates);
        res.status(200).json({ message: 'Foro actualizado exitosamente.' });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Datos de entrada inválidos.', errors: error.errors });
        }
        console.error(`Error al actualizar foro con ID ${req.params.id_foro}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Delete a forum
// Only the creator or an admin can delete a forum
exports.deleteForum = async (req, res) => {
    try {
        const { id_foro } = req.params;
        const requester_uid = req.user.uid;
        const requester_rol = req.user.rol; // Assuming 'rol' is in custom claims

        const forumRef = db.collection('foros').doc(id_foro);
        const doc = await forumRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: `Foro con ID ${id_foro} no encontrado.` });
        }

        const forumData = doc.data();

        // Authorization check: Only creator or admin can delete
        if (forumData.creador_uid !== requester_uid && requester_rol !== 'admin') {
            return res.status(403).json({ message: 'Acceso denegado. Solo el creador o un administrador pueden eliminar este foro.' });
        }

        await forumRef.delete();
        res.status(200).json({ message: 'Foro eliminado exitosamente.' });
    } catch (error) {
        console.error(`Error al eliminar foro con ID ${req.params.id_foro}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};