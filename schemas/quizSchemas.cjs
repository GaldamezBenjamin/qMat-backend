const { z } = require('zod');

// Schema for creating a new quiz
const createQuizSchema = z.object({
    nombre: z.string().min(5, 'El nombre del quiz debe tener al menos 5 caracteres.').max(100, 'El nombre del quiz no debe exceder los 100 caracteres.'),
    dificultad: z.enum(['Baja', 'Media', 'Alta', 'Muy Alta'], 'La dificultad debe ser "Baja", "Media", "Alta" o "Muy Alta".'),
    cantidad_preguntas: z.number().int().min(1, 'La cantidad de preguntas debe ser al menos 1.').max(50, 'La cantidad de preguntas no debe exceder 50.'), // Example max
    tiempo_estimado: z.number().int().min(1, 'El tiempo estimado debe ser al menos 1 minuto.').max(120, 'El tiempo estimado no debe exceder 120 minutos.'), // Example max
    id_preguntas: z.array(z.string().min(1, 'Cada ID de pregunta no puede estar vacío.')).min(1, 'Debe haber al menos un ID de pregunta.').max(50, 'El quiz no debe tener más de 50 preguntas.'), // Max should match cantidad_preguntas logic
}).strict('Campos no permitidos en la creación del quiz.');

// Schema for updating an existing quiz
const updateQuizSchema = z.object({
    nombre: z.string().min(5, 'El nombre del quiz debe tener al menos 5 caracteres.').max(100, 'El nombre del quiz no debe exceder los 100 caracteres.').optional(),
    dificultad: z.enum(['Baja', 'Media', 'Alta', 'Muy Alta'], 'La dificultad debe ser "Baja", "Media", "Alta" o "Muy Alta".').optional(),
    cantidad_preguntas: z.number().int().min(1, 'La cantidad de preguntas debe ser al menos 1.').max(50, 'La cantidad de preguntas no debe exceder 50.').optional(),
    tiempo_estimado: z.number().int().min(1, 'El tiempo estimado debe ser al menos 1 minuto.').max(120, 'El tiempo estimado no debe exceder 120 minutos.').optional(),
    id_preguntas: z.array(z.string().min(1, 'Cada ID de pregunta no puede estar vacío.')).min(1, 'Debe haber al menos un ID de pregunta.').max(50, 'El quiz no debe tener más de 50 preguntas.').optional(),
}).strict('Campos no permitidos en la actualización del quiz.');

module.exports = {
    createQuizSchema,
    updateQuizSchema,
};