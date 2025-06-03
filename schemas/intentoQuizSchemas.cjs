const { z } = require('zod');

// Schema for a single user answer within 'respuestas_usuario'
const userAnswerSchema = z.object({
    id_pregunta: z.string().min(1, 'El ID de la pregunta es obligatorio.'),
    respuesta_usuario: z.string().min(1, 'La respuesta del usuario no puede estar vacía.'),
    es_correcta: z.boolean(),
}).strict('Campos no permitidos en la respuesta del usuario.');

// Schema for creating a new quiz attempt
const createQuizAttemptSchema = z.object({
    id_quiz: z.string().min(1, 'El ID del quiz es obligatorio.'),
    // uid, fecha_inicio, fecha_fin will be added by the server or updated later
    respuestas_usuario: z.array(userAnswerSchema).default([]),
}).strict('Campos no permitidos en la creación del intento de quiz.');

// Schema for updating a quiz attempt (e.g., when the user finishes)
const updateQuizAttemptSchema = z.object({
    fecha_fin: z.date().optional(), // Can be updated when the quiz is finished
    respuestas_usuario: z.array(userAnswerSchema).optional(), // Entire array can be updated
}).strict('Campos no permitidos en la actualización del intento de quiz.');

// Schema for submitting results for a quiz attempt (often implies finalization)
const submitQuizResultsSchema = z.object({
    respuestas_usuario: z.array(userAnswerSchema).min(1, 'Debe proporcionar al menos una respuesta de usuario.'),
    // Optionally include other fields if they are submitted at the end
    // For simplicity, we'll assume fecha_fin is set automatically on submission.
}).strict('Campos no permitidos en el envío de resultados del quiz.');


module.exports = {
    createQuizAttemptSchema,
    updateQuizAttemptSchema,
    submitQuizResultsSchema
};