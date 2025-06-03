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

// Submit quiz results (User updates their own attempt, Admin can update any)
// This endpoint would typically be called when the user finishes a quiz.
// It populates 'respuestas_usuario' and sets 'fecha_fin'.
exports.submitQuizResults = async (req, res) => {
    try {
        const { id_intento } = req.params;
        const { respuestas_usuario } = req.body;
        const requester_uid = req.user.uid;
        const requester_rol = req.user.rol;

        // Validate provided answers
        const validatedResults = submitQuizResultsSchema.parse({ respuestas_usuario });

        const attemptRef = db.collection('intentos_quiz').doc(id_intento);
        const doc = await attemptRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: `Intento de quiz con ID ${id_intento} no encontrado.` });
        }

        const attemptData = doc.data();

        // Authorization check
        if (attemptData.uid !== requester_uid && requester_rol !== 'admin') {
            return res.status(403).json({ message: 'Acceso denegado. Solo puedes enviar resultados para tus propios intentos de quiz.' });
        }

        // Prevent resubmission if already finished
        if (attemptData.fecha_fin) {
            return res.status(400).json({ message: 'Este intento de quiz ya ha sido finalizado.' });
        }

        // OPTIONAL BUT HIGHLY RECOMMENDED: Server-side scoring and validation
        // Fetch original questions to verify correct answers and `es_correcta`
        const questionIds = validatedResults.respuestas_usuario.map(r => r.id_pregunta);
        const uniqueQuestionIds = [...new Set(questionIds)]; // Avoid fetching duplicates

        const questionsSnapshot = await db.collection('preguntas')
            .where(admin.firestore.FieldPath.documentId(), 'in', uniqueQuestionIds)
            .get();

        if (questionsSnapshot.empty) {
             return res.status(400).json({ message: 'Una o más preguntas en las respuestas proporcionadas no existen.' });
        }

        const questionsMap = new Map();
        questionsSnapshot.forEach(qDoc => {
            questionsMap.set(qDoc.id, qDoc.data());
        });

        // Re-evaluate 'es_correcta' on the server side to prevent client-side tampering
        const verifiedAnswers = validatedResults.respuestas_usuario.map(userAnswer => {
            const question = questionsMap.get(userAnswer.id_pregunta);
            if (!question) {
                // This scenario should ideally be caught by the previous check or handled as an error
                console.warn(`Question ${userAnswer.id_pregunta} not found during scoring.`);
                return { ...userAnswer, es_correcta: false }; // Default to incorrect if question not found
            }
            const correctOptionKey = question.opciones.correcta; // 'a', 'b', 'c', or 'd'
            const isCorrect = userAnswer.respuesta_usuario === question.opciones[correctOptionKey];
            return {
                id_pregunta: userAnswer.id_pregunta,
                respuesta_usuario: userAnswer.respuesta_usuario,
                es_correcta: isCorrect
            };
        });

        // Update the attempt with answers and end time
        await attemptRef.update({
            respuestas_usuario: verifiedAnswers,
            fecha_fin: admin.firestore.Timestamp.now()
        });

        res.status(200).json({ message: 'Resultados del quiz enviados exitosamente.', verified_answers: verifiedAnswers });
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