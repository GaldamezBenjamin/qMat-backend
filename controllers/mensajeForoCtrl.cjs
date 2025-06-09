const { db, admin } = require('../config/firebase.cjs');
const { createForumMessageSchema, updateForumMessageSchema } = require('../schemas/mensajeForoSchemas.cjs');
const { z } = require('zod');

// Get all messages for a specific forum
exports.getMessagesByForumId = async (req, res) => {
    try {
        const { id_foro } = req.params;

        // Optional: Verify if the forum itself exists
        const forumRef = db.collection('foros').doc(id_foro);
        const forumDoc = await forumRef.get();
        if (!forumDoc.exists) {
            return res.status(404).json({ message: `Foro con ID ${id_foro} no encontrado.` });
        }

        const messagesRef = db.collection('mensajes_foro')
                              .where('id_foro', '==', id_foro)
                              .orderBy('fecha_creacion', 'asc'); // Order by creation date

        const snapshot = await messagesRef.get();

        if (snapshot.empty) {
            return res.status(404).json({ message: `No se encontraron mensajes para el foro con ID ${id_foro}.` });
        }

        const messages = [];
        snapshot.forEach(doc => {
            messages.push({
                id_mensaje: doc.id,
                ...doc.data()
            });
        });
        res.status(200).json(messages);
    } catch (error) {
        console.error('Error al obtener mensajes del foro:', error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Get a single message by ID
exports.getMessageById = async (req, res) => {
    try {
        const { id_mensaje } = req.params;
        const messageRef = db.collection('mensajes_foro').doc(id_mensaje);
        const doc = await messageRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: `Mensaje con ID ${id_mensaje} no encontrado.` });
        }

        res.status(200).json({ id_mensaje: doc.id, ...doc.data() });
    } catch (error) {
        console.error(`Error al obtener mensaje con ID ${req.params.id_mensaje}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Create a new forum message
// Any authenticated user can post a message
exports.createMessage = async (req, res) => {
    try {
        const { contenido, id_foro } = req.body;
        const autor_uid = req.user.uid; // Get UID from the authenticated token

        // Validate request body with Zod
        const validatedData = createForumMessageSchema.parse({ contenido, id_foro });

        // Verify if id_foro exists in the 'foros' collection
        const forumRef = db.collection('foros').doc(validatedData.id_foro);
        const forumDoc = await forumRef.get();

        if (!forumDoc.exists) {
            return res.status(400).json({ message: `El foro con ID ${validatedData.id_foro} no existe.` });
        }

        const newMessage = {
            contenido: validatedData.contenido,
            fecha_creacion: admin.firestore.Timestamp.now(),
            autor_uid: autor_uid,
            id_foro: validatedData.id_foro
        };

        const newMessageRef = db.collection('mensajes_foro').doc(); // Auto-generate ID
        await newMessageRef.set(newMessage);

        res.status(201).json({ message: 'Mensaje creado exitosamente.', id_mensaje: newMessageRef.id, message: newMessage });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Datos de entrada inválidos.', errors: error.errors });
        }
        console.error('Error al crear mensaje:', error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Update an existing forum message
// Only the author or an admin can update a message
exports.updateMessage = async (req, res) => {
    try {
        const { id_mensaje } = req.params;
        const updates = req.body;
        const requester_uid = req.user.uid;
        const requester_rol = req.user.rol; // Assuming 'rol' is in custom claims

        // Validate request body with Zod
        const validatedUpdates = updateForumMessageSchema.parse(updates);

        const messageRef = db.collection('mensajes_foro').doc(id_mensaje);
        const doc = await messageRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: `Mensaje con ID ${id_mensaje} no encontrado.` });
        }

        const messageData = doc.data();

        // Authorization check: Only author or admin can update
        if (messageData.autor_uid !== requester_uid && requester_rol !== 'admin') {
            return res.status(403).json({ message: 'Acceso denegado. Solo el autor o un administrador pueden actualizar este mensaje.' });
        }

        await messageRef.update(validatedUpdates);
        res.status(200).json({ message: 'Mensaje actualizado exitosamente.' });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Datos de entrada inválidos.', errors: error.errors });
        }
        console.error(`Error al actualizar mensaje con ID ${req.params.id_mensaje}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Delete a forum message
// Only the author or an admin can delete a message
exports.deleteMessage = async (req, res) => {
    try {
        const { id_mensaje } = req.params;
        const requester_uid = req.user.uid;
        const requester_rol = req.user.rol; // Assuming 'rol' is in custom claims

        const messageRef = db.collection('mensajes_foro').doc(id_mensaje);
        const doc = await messageRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: `Mensaje con ID ${id_mensaje} no encontrado.` });
        }

        const messageData = doc.data();

        // Authorization check: Only author or admin can delete
        if (messageData.autor_uid !== requester_uid && requester_rol !== 'admin') {
            return res.status(403).json({ message: 'Acceso denegado. Solo el autor o un administrador pueden eliminar este mensaje.' });
        }

        await messageRef.delete();
        res.status(200).json({ message: 'Mensaje eliminado exitosamente.' });
    } catch (error) {
        console.error(`Error al eliminar mensaje con ID ${req.params.id_mensaje}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};