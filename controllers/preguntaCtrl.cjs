const { db } = require('../config/firebase.cjs');
const { createQuestionSchema, updateQuestionSchema } = require('../schemas/preguntaSchemas.cjs');
const { z } = require('zod');

// Get all questions (can be filtered by id_subcategoria)
exports.getAllQuestions = async (req, res) => {
    try {
        const { id_subcategoria } = req.query; // Allow filtering by subcategory
        let questionsRef = db.collection('preguntas');

        if (id_subcategoria) {
            questionsRef = questionsRef.where('id_subcategoria', '==', id_subcategoria);
        }

        const snapshot = await questionsRef.get();

        if (snapshot.empty) {
            return res.status(404).json({ message: 'No se encontraron preguntas.' });
        }

        const questions = [];
        snapshot.forEach(doc => {
            questions.push({
                id_pregunta: doc.id,
                ...doc.data()
            });
        });
        res.status(200).json(questions);
    } catch (error) {
        console.error('Error al obtener preguntas:', error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Get question by ID
exports.getQuestionById = async (req, res) => {
    try {
        const { id_pregunta } = req.params;
        const questionRef = db.collection('preguntas').doc(id_pregunta);
        const doc = await questionRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: `Pregunta con ID ${id_pregunta} no encontrada.` });
        }

        res.status(200).json({ id_pregunta: doc.id, ...doc.data() });
    } catch (error) {
        console.error(`Error al obtener pregunta con ID ${req.params.id_pregunta}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Create a new question
// Only accessible by admin users
exports.createQuestion = async (req, res) => {
    try {
        // Añadir 'explicacion' a la desestructuración del cuerpo de la petición
        const { enunciado, dificultad, opciones, id_subcategoria, explicacion } = req.body;

        // Validar el cuerpo de la petición con Zod, incluyendo 'explicacion'
        const validatedData = createQuestionSchema.parse({ enunciado, dificultad, opciones, id_subcategoria, explicacion });

        // Verify if id_subcategoria exists in the 'sub_categorias' collection
        const subCategoryRef = db.collection('sub_categorias').doc(validatedData.id_subcategoria);
        const subCategoryDoc = await subCategoryRef.get();

        if (!subCategoryDoc.exists) {
            return res.status(400).json({ message: `La subcategoría con ID ${validatedData.id_subcategoria} no existe.` });
        }

        const newQuestionRef = db.collection('preguntas').doc(); // Auto-generate ID
        // Guardar todos los datos validados, incluyendo 'explicacion'
        await newQuestionRef.set(validatedData);

        res.status(201).json({ message: 'Pregunta creada exitosamente.', id_pregunta: newQuestionRef.id, question: validatedData });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Datos de entrada inválidos.', errors: error.errors });
        }
        console.error('Error al crear pregunta:', error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Update an existing question
// Only accessible by admin users
exports.updateQuestion = async (req, res) => {
    try {
        const { id_pregunta } = req.params;
        const updates = req.body; // 'updates' ya contiene todos los campos enviados, incluyendo 'explicacion' si se envía

        // Validar el cuerpo de la petición con Zod. updateQuestionSchema ya incluye 'explicacion' como opcional.
        const validatedUpdates = updateQuestionSchema.parse(updates);

        const questionRef = db.collection('preguntas').doc(id_pregunta);
        const doc = await questionRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: `Pregunta con ID ${id_pregunta} no encontrada.` });
        }

        // If id_subcategoria is being updated, verify its existence
        if (validatedUpdates.id_subcategoria && validatedUpdates.id_subcategoria !== doc.data().id_subcategoria) {
            const subCategoryRef = db.collection('sub_categorias').doc(validatedUpdates.id_subcategoria);
            const subCategoryDoc = await subCategoryRef.get();
            if (!subCategoryDoc.exists) {
                return res.status(400).json({ message: `La nueva subcategoría con ID ${validatedUpdates.id_subcategoria} no existe.` });
            }
        }

        // Actualizar el documento con los datos validados. 'explicacion' se incluirá si está presente en 'validatedUpdates'.
        await questionRef.update(validatedUpdates);
        res.status(200).json({ message: 'Pregunta actualizada exitosamente.' });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Datos de entrada inválidos.', errors: error.errors });
        }
        console.error(`Error al actualizar pregunta con ID ${req.params.id_pregunta}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Delete a question
// Only accessible by admin users
exports.deleteQuestion = async (req, res) => {
    try {
        const { id_pregunta } = req.params;
        const questionRef = db.collection('preguntas').doc(id_pregunta);
        const doc = await questionRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: `Pregunta con ID ${id_pregunta} no encontrada.` });
        }

        await questionRef.delete();
        res.status(200).json({ message: 'Pregunta eliminada exitosamente.' });
    } catch (error) {
        console.error(`Error al eliminar pregunta con ID ${req.params.id_pregunta}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};