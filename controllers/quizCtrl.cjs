const { db } = require('../config/firebase.cjs');
const { createQuizSchema, updateQuizSchema } = require('../schemas/quizSchemas.cjs');
const { z } = require('zod');

// Get all quizzes (Accessible to all authenticated users)
exports.getAllQuizzes = async (req, res) => {
    try {
        const quizzesRef = db.collection('quizzes');
        const snapshot = await quizzesRef.get();

        if (snapshot.empty) {
            return res.status(404).json({ message: 'No se encontraron quizzes.' });
        }

        const quizzes = [];
        snapshot.forEach(doc => {
            quizzes.push({
                id_quiz: doc.id,
                ...doc.data()
            });
        });
        res.status(200).json(quizzes);
    } catch (error) {
        console.error('Error al obtener quizzes:', error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Get quiz by ID (Accessible to all authenticated users)
exports.getQuizById = async (req, res) => {
    try {
        const { id_quiz } = req.params;
        const quizRef = db.collection('quizzes').doc(id_quiz);
        const doc = await quizRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: `Quiz con ID ${id_quiz} no encontrado.` });
        }

        res.status(200).json({ id_quiz: doc.id, ...doc.data() });
    } catch (error) {
        console.error(`Error al obtener quiz con ID ${req.params.id_quiz}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Get all questions for a specific quiz (Accessible to all authenticated users)
exports.getQuestionsByQuizId = async (req, res) => {
    try {
        const { id_quiz } = req.params;

        // 1. Get the quiz document to retrieve its question IDs
        const quizRef = db.collection('quizzes').doc(id_quiz);
        const quizDoc = await quizRef.get();

        if (!quizDoc.exists) {
            return res.status(404).json({ message: `Quiz con ID ${id_quiz} no encontrado.` });
        }

        const quizData = quizDoc.data();
        const questionIds = quizData.id_preguntas;

        // Handle case where a quiz might not have questions yet (though your schema ensures it does)
        if (!questionIds || questionIds.length === 0) {
            return res.status(200).json({ message: `El quiz con ID ${id_quiz} no tiene preguntas asignadas.`, questions: [] });
        }

        // 2. Fetch all question documents individually and in parallel
        //    This is the most robust approach for >10 IDs
        const questionPromises = questionIds.map(async (questionId) => {
            const questionDoc = await db.collection('preguntas').doc(questionId).get();
            if (questionDoc.exists) {
                return {
                    id_pregunta: questionDoc.id,
                    ...questionDoc.data()
                };
            }
            // If a question ID doesn't exist, you might choose to
            // skip it, return null, or throw an error depending on your needs.
            // For now, we'll just skip it (return undefined, which Promise.all filters out).
            return undefined;
        });

        const questions = (await Promise.all(questionPromises)).filter(q => q !== undefined);

        // Optional: If you need to ensure all questions were found, check `questions.length`
        if (questions.length !== questionIds.length) {
            console.warn(`Advertencia: Se esperaban ${questionIds.length} preguntas, pero se encontraron ${questions.length} para el quiz ${id_quiz}.`);
            // You might choose to return a 404 or a warning here if a mismatch is critical.
        }

        res.status(200).json(questions);
    } catch (error) {
        console.error(`Error al obtener preguntas para el quiz con ID ${req.params.id_quiz}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Create a new quiz (Admin only)
exports.createQuiz = async (req, res) => {
    try {
        const { nombre, dificultad, cantidad_preguntas, tiempo_estimado, id_preguntas } = req.body;

        // Validate request body with Zod
        const validatedData = createQuizSchema.parse({ nombre, dificultad, cantidad_preguntas, tiempo_estimado, id_preguntas });

        // Basic check: Ensure cantidad_preguntas matches id_preguntas array length
        if (validatedData.cantidad_preguntas !== validatedData.id_preguntas.length) {
            return res.status(400).json({ message: 'La cantidad de preguntas debe coincidir con el número de IDs de preguntas proporcionados.' });
        }

        // Verify if all question IDs exist in the 'preguntas' collection
        const questionChecks = validatedData.id_preguntas.map(async (questionId) => {
            const questionDoc = await db.collection('preguntas').doc(questionId).get();
            if (!questionDoc.exists) {
                throw new Error(`La pregunta con ID ${questionId} no existe.`);
            }
        });
        await Promise.all(questionChecks);

        const newQuizRef = db.collection('quizzes').doc(); // Auto-generate ID
        await newQuizRef.set(validatedData);

        res.status(201).json({ message: 'Quiz creado exitosamente.', id_quiz: newQuizRef.id, quiz: validatedData });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Datos de entrada inválidos.', errors: error.errors });
        }
        console.error('Error al crear quiz:', error);
        // Custom error for non-existent questions
        if (error.message.includes('La pregunta con ID')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Update an existing quiz (Admin only)
exports.updateQuiz = async (req, res) => {
    try {
        const { id_quiz } = req.params;
        const updates = req.body;

        // Validate request body with Zod
        const validatedUpdates = updateQuizSchema.parse(updates);

        const quizRef = db.collection('quizzes').doc(id_quiz);
        const doc = await quizRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: `Quiz con ID ${id_quiz} no encontrado.` });
        }

        // If id_preguntas or cantidad_preguntas are being updated, perform checks
        if (validatedUpdates.id_preguntas) {
            // Ensure cantidad_preguntas matches id_preguntas array length if both are provided
            if (validatedUpdates.cantidad_preguntas && validatedUpdates.cantidad_preguntas !== validatedUpdates.id_preguntas.length) {
                return res.status(400).json({ message: 'La cantidad de preguntas debe coincidir con el número de IDs de preguntas proporcionados.' });
            } else if (!validatedUpdates.cantidad_preguntas && validatedUpdates.id_preguntas.length !== doc.data().cantidad_preguntas) {
                // If only id_preguntas is updated, check against existing cantidad_preguntas
                 return res.status(400).json({ message: 'El número de IDs de preguntas no coincide con la cantidad de preguntas existente en el quiz.' });
            }

            // Verify if all updated question IDs exist
            const questionChecks = validatedUpdates.id_preguntas.map(async (questionId) => {
                const questionDoc = await db.collection('preguntas').doc(questionId).get();
                if (!questionDoc.exists) {
                    throw new Error(`La pregunta con ID ${questionId} no existe.`);
                }
            });
            await Promise.all(questionChecks);
        } else if (validatedUpdates.cantidad_preguntas && validatedUpdates.cantidad_preguntas !== doc.data().id_preguntas.length) {
            // If only cantidad_preguntas is updated, it must match the current id_preguntas length
            return res.status(400).json({ message: 'La cantidad de preguntas actualizada debe coincidir con el número de IDs de preguntas existentes.' });
        }


        await quizRef.update(validatedUpdates);
        res.status(200).json({ message: 'Quiz actualizado exitosamente.' });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Datos de entrada inválidos.', errors: error.errors });
        }
        console.error(`Error al actualizar quiz con ID ${req.params.id_quiz}:`, error);
        // Custom error for non-existent questions
        if (error.message.includes('La pregunta con ID')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Delete a quiz (Admin only)
exports.deleteQuiz = async (req, res) => {
    try {
        const { id_quiz } = req.params;
        const quizRef = db.collection('quizzes').doc(id_quiz);
        const doc = await quizRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: `Quiz con ID ${id_quiz} no encontrado.` });
        }

        await quizRef.delete();
        res.status(200).json({ message: 'Quiz eliminado exitosamente.' });
    } catch (error) {
        console.error(`Error al eliminar quiz con ID ${req.params.id_quiz}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};