const { z } = require('zod');

// Schema for a single 'respuestas_por_categoria' entry
const subCategoryResponseSchema = z.object({
    id_subcategoria: z.string().min(1, 'El ID de la subcategoría es obligatorio.'),
    correctas: z.number().int().min(0, 'El número de respuestas correctas no puede ser negativo.'),
    incorrectas: z.number().int().min(0, 'El número de respuestas incorrectas no puede ser negativo.'),
}).strict('Campos no permitidos en la respuesta por subcategoría.');

// Schema for creating a new user's statistics profile
// UID is taken from auth token, not from body
const createStatisticSchema = z.object({
    quizzes_completados: z.number().int().min(0, 'Quizzes completados no puede ser negativo.').default(0),
    tiempo_promedio: z.number().min(0, 'El tiempo promedio no puede ser negativo.').default(0),
    respuestas_por_categoria: z.array(subCategoryResponseSchema).default([]),
}).strict('Campos no permitidos en la creación de estadísticas.');

// Schema for updating an existing user's statistics profile
// Allows partial updates
const updateStatisticSchema = z.object({
    quizzes_completados: z.number().int().min(0, 'Quizzes completados no puede ser negativo.').optional(),
    tiempo_promedio: z.number().min(0, 'El tiempo promedio no puede ser negativo.').optional(),
    // For arrays, we typically replace the whole array or use a separate endpoint for atomic updates.
    // Here, we'll allow replacing the entire array if provided.
    respuestas_por_categoria: z.array(subCategoryResponseSchema).optional(),
}).strict('Campos no permitidos en la actualización de estadísticas.');

// Schema for updating a specific subcategory within 'respuestas_por_categoria'
// This is for a PATCH operation to add/update stats for one subcategory
const updateSubCategoryStatsSchema = z.object({
    id_subcategoria: z.string().min(1, 'El ID de la subcategoría es obligatorio.'),
    correctas: z.number().int().min(0, 'El número de respuestas correctas no puede ser negativo.').optional(),
    incorrectas: z.number().int().min(0, 'El número de respuestas incorrectas no puede ser negativo.').optional(),
}).strict('Campos no permitidos en la actualización de estadísticas por subcategoría.');


module.exports = {
    createStatisticSchema,
    updateStatisticSchema,
    updateSubCategoryStatsSchema
};