const { z } = require('zod');

// Schema for creating a new forum
const createForumSchema = z.object({
    titulo: z.string().min(5, 'El título del foro debe tener al menos 5 caracteres.').max(100, 'El título del foro no debe exceder los 100 caracteres.'),
    descripcion: z.string().min(10, 'La descripción del foro debe tener al menos 10 caracteres.').max(500, 'La descripción del foro no debe exceder los 500 caracteres.'),
    // creador_uid will be taken from the authenticated user's token, not the request body
}).strict('Campos no permitidos en la creación del foro.');

// Schema for updating an existing forum
const updateForumSchema = z.object({
    titulo: z.string().min(5, 'El título del foro debe tener al menos 5 caracteres.').max(100, 'El título del foro no debe exceder los 100 caracteres.').optional(),
    descripcion: z.string().min(10, 'La descripción del foro debe tener al menos 10 caracteres.').max(500, 'La descripción del foro no debe exceder los 500 caracteres.').optional(),
}).strict('Campos no permitidos en la actualización del foro.');

module.exports = {
    createForumSchema,
    updateForumSchema,
};