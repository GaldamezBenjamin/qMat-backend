const { db, admin } = require('../config/firebase.cjs');
const { createQuizAttemptSchema, updateQuizAttemptSchema, submitQuizResultsSchema } = require('../schemas/intentoQuizSchemas.cjs');
const { z } = require('zod');

// Get all quiz attempts (Admin only)
exports.getAllQuizAttempts = async (req, res) => {
    try {
        const attemptsRef = db.collection('intentos_quiz');
        const snapshot = await attemptsRef.get();

        if (snapshot.empty) {
            return res.status(404).json({ message: 'No se encontraron intentos de quiz.' });
        }

        const attempts = [];
        snapshot.forEach(doc => {
            attempts.push({
                id_intento: doc.id,
                ...doc.data()
            });
        });
        res.status(200).json(attempts);
    } catch (error) {
        console.error('Error al obtener intentos de quiz:', error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Get quiz attempts by user UID (User can get their own, Admin can get any)
exports.getQuizAttemptsByUid = async (req, res) => {
    try {
        const { uid } = req.params;
        const requester_uid = req.user.uid;
        const requester_rol = req.user.rol;

        // Authorization check: User can only get their own attempts unless they are an admin
        if (uid !== requester_uid && requester_rol !== 'admin') {
            return res.status(403).json({ message: 'Acceso denegado. Solo puedes ver tus propios intentos de quiz.' });
        }

        const attemptsRef = db.collection('intentos_quiz')
                              .where('uid', '==', uid)
                              .orderBy('fecha_inicio', 'desc'); // Order by latest attempt

        const snapshot = await attemptsRef.get();

        if (snapshot.empty) {
            return res.status(404).json({ message: `No se encontraron intentos de quiz para el usuario ${uid}.` });
        }

        const attempts = [];
        snapshot.forEach(doc => {
            attempts.push({
                id_intento: doc.id,
                ...doc.data()
            });
        });
        res.status(200).json(attempts);
    } catch (error) {
        console.error(`Error al obtener intentos de quiz para UID ${req.params.uid}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Get a single quiz attempt by ID (User can get their own, Admin can get any)
exports.getQuizAttemptById = async (req, res) => {
    try {
        const { id_intento } = req.params;
        const requester_uid = req.user.uid;
        const requester_rol = req.user.rol;

        const attemptRef = db.collection('intentos_quiz').doc(id_intento);
        const doc = await attemptRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: `Intento de quiz con ID ${id_intento} no encontrado.` });
        }

        const attemptData = doc.data();

        // Authorization check
        if (attemptData.uid !== requester_uid && requester_rol !== 'admin') {
            return res.status(403).json({ message: 'Acceso denegado. Solo puedes ver tus propios intentos de quiz o los de un administrador.' });
        }

        res.status(200).json({ id_intento: doc.id, ...attemptData });
    } catch (error) {
        console.error(`Error al obtener intento de quiz con ID ${req.params.id_intento}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Start a new quiz attempt (Any authenticated user)
// This endpoint initializes the attempt, setting fecha_inicio
exports.startQuizAttempt = async (req, res) => {
    try {
        const { id_quiz } = req.body;
        const user_uid = req.user.uid; // UID from authenticated token

        // Validate basic input
        const validatedData = createQuizAttemptSchema.pick({ id_quiz: true }).parse({ id_quiz });

        // Verify if id_quiz exists in the 'quizzes' collection
        const quizRef = db.collection('quizzes').doc(validatedData.id_quiz);
        const quizDoc = await quizRef.get();

        if (!quizDoc.exists) {
            return res.status(400).json({ message: `El quiz con ID ${validatedData.id_quiz} no existe.` });
        }

        const newAttempt = {
            uid: user_uid,
            id_quiz: validatedData.id_quiz,
            fecha_inicio: admin.firestore.Timestamp.now(),
            fecha_fin: null, // Initially null
            respuestas_usuario: [], // Initially empty
        };

        const newAttemptRef = db.collection('intentos_quiz').doc(); // Auto-generate ID
        await newAttemptRef.set(newAttempt);

        res.status(201).json({ message: 'Intento de quiz iniciado exitosamente.', id_intento: newAttemptRef.id, attempt: newAttempt });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Datos de entrada inválidos.', errors: error.errors });
        }
        console.error('Error al iniciar intento de quiz:', error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// This endpoint would typically be called when the user finishes a quiz.
// It populates 'respuestas_usuario' and sets 'fecha_fin'.
// Submit quiz results for an attempt (User updates their own, Admin can update any)
exports.submitQuizResults = async (req, res) => {
    try {
        const { id_intento } = req.params;
        const { respuestas_usuario } = req.body; // This now contains id_pregunta, respuesta_usuario, es_correcta
        const requester_uid = req.user.uid;
        const requester_rol = req.user.rol;

        // Authorization check
        const attemptRef = db.collection('intentos_quiz').doc(id_intento);
        const attemptDoc = await attemptRef.get();

        if (!attemptDoc.exists) {
            return res.status(404).json({ message: 'Intento de quiz no encontrado.' });
        }

        const attemptData = attemptDoc.data();

        if (attemptData.uid !== requester_uid && requester_rol !== 'admin') {
            return res.status(403).json({ message: 'Acceso denegado. No puedes enviar resultados de este intento.' });
        }

        // Validate the incoming answers
        const validatedResults = submitQuizResultsSchema.parse({ respuestas_usuario });

        // Fetch quiz details to get its question IDs
        const quizRef = db.collection('quizzes').doc(attemptData.id_quiz);
        const quizDoc = await quizRef.get();

        if (!quizDoc.exists) {
            return res.status(404).json({ message: 'Quiz asociado no encontrado.' });
        }
        const quizData = quizDoc.data();
        const questionIdsInQuiz = quizData.id_preguntas; // Get the array of question IDs from the quiz

        if (!questionIdsInQuiz || questionIdsInQuiz.length === 0) {
            return res.status(400).json({ message: 'El quiz no tiene preguntas asignadas.' });
        }

        // Fetch all question documents to get their subcategory IDs
        const questionPromises = questionIdsInQuiz.map(id => db.collection('preguntas').doc(id).get());
        const questionDocs = await Promise.all(questionPromises);

        const quizQuestionsMap = new Map(); // Map: question_id -> subcategory_id
        questionDocs.forEach(doc => {
            if (doc.exists && doc.data().id_subcategoria) {
                quizQuestionsMap.set(doc.id, doc.data().id_subcategoria);
            }
        });

        // 1. Calculate duration for the current attempt
        const fechaInicioMs = attemptData.fecha_inicio.toDate().getTime();
        const fechaFinTimestamp = admin.firestore.Timestamp.now();
        const fechaFinMs = fechaFinTimestamp.toDate().getTime();
        const durationSeconds = (fechaFinMs - fechaInicioMs) / 1000;

        // 2. Update the quiz attempt document with results
        await attemptRef.update({
            respuestas_usuario: validatedResults.respuestas_usuario,
            fecha_fin: fechaFinTimestamp,
            duracion_segundos: durationSeconds
        });

        // 3. Prepare data for general user statistics update
        const userStatsRef = db.collection('estadisticas').doc(requester_uid);
        const userStatsDoc = await userStatsRef.get();

        let currentTotalTiempo = durationSeconds;
        let currentQuizzesCompletados = 1; // Increment by 1 for this quiz completion

        // Initialize subcategory tallies for this quiz attempt
        const subCategoryTally = {}; // { 'subcat_id': { correctas: N, incorrectas: M } }

        validatedResults.respuestas_usuario.forEach(answer => {
            const subCategoryId = quizQuestionsMap.get(answer.id_pregunta);
            if (subCategoryId) {
                if (!subCategoryTally[subCategoryId]) {
                    subCategoryTally[subCategoryId] = { correctas: 0, incorrectas: 0 };
                }
                if (answer.es_correcta) {
                    subCategoryTally[subCategoryId].correctas++;
                } else {
                    subCategoryTally[subCategoryId].incorrectas++;
                }
            } else {
                console.warn(`Subcategoría no encontrada para la pregunta ID: ${answer.id_pregunta}`);
            }
        });

        if (userStatsDoc.exists) {
            const statsData = userStatsDoc.data();
            currentTotalTiempo += (statsData.total_tiempo || 0);
            currentQuizzesCompletados += (statsData.quizzes_completados || 0); // Add previous completed quizzes
        }

        const newTiempoPromedio = currentTotalTiempo / currentQuizzesCompletados;

        // Use a Firestore batch for atomic updates
        const batch = db.batch();

        // Update main statistics fields
        batch.set(userStatsRef, {
            total_tiempo: currentTotalTiempo,
            quizzes_completados: currentQuizzesCompletados,
            tiempo_promedio: newTiempoPromedio,
            ultima_actualizacion: admin.firestore.Timestamp.now()
        }, { merge: true });

        // Update `respuestas_por_categoria` for each subcategory atomically
        let existingRespuestasPorCategoria = userStatsDoc.exists && Array.isArray(userStatsDoc.data().respuestas_por_categoria)
            ? [...userStatsDoc.data().respuestas_por_categoria] // Create a mutable copy
            : [];

        for (const subcatId in subCategoryTally) {
            const tally = subCategoryTally[subcatId];
            const existingIndex = existingRespuestasPorCategoria.findIndex(
                (item) => item.id_subcategoria === subcatId
            );

            if (existingIndex > -1) {
                existingRespuestasPorCategoria[existingIndex].correctas =
                    (existingRespuestasPorCategoria[existingIndex].correctas || 0) + tally.correctas;
                existingRespuestasPorCategoria[existingIndex].incorrectas =
                    (existingRespuestasPorCategoria[existingIndex].incorrectas || 0) + tally.incorrectas;
            } else {
                existingRespuestasPorCategoria.push({
                    id_subcategoria: subcatId,
                    correctas: tally.correctas,
                    incorrectas: tally.incorrectas,
                });
            }
        }

        batch.update(userStatsRef, {
            respuestas_por_categoria: existingRespuestasPorCategoria
        });

        await batch.commit();

        res.status(200).json({ message: 'Resultados del quiz y estadísticas actualizadas exitosamente.' });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Datos de entrada inválidos.', errors: error.errors });
        }
        console.error(`Error al enviar resultados del quiz para intento ${req.params.id_intento}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Delete a quiz attempt (Admin only)
exports.deleteQuizAttempt = async (req, res) => {
    try {
        const { id_intento } = req.params;
        const attemptRef = db.collection('intentos_quiz').doc(id_intento);
        const doc = await attemptRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: `Intento de quiz con ID ${id_intento} no encontrado.` });
        }

        await attemptRef.delete();
        res.status(200).json({ message: 'Intento de quiz eliminado exitosamente.' });
    } catch (error) {
        console.error(`Error al eliminar intento de quiz con ID ${req.params.id_intento}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};