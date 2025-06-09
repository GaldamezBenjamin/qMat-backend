const { z } = require('zod');

// Schema for creating a new forum message
const createForumMessageSchema = z.object({
    contenido: z.string().min(1, 'El contenido del mensaje no puede estar vacío.').max(2000, 'El contenido del mensaje no debe exceder los 2000 caracteres.'),
    id_foro: z.string().min(1, 'El ID del foro es obligatorio.'),
    // autor_uid and fecha_creacion will be added by the server
}).strict('Campos no permitidos en la creación del mensaje.');

// Schema for updating an existing forum message
const updateForumMessageSchema = z.object({
    contenido: z.string().min(1, 'El contenido del mensaje no puede estar vacío.').max(2000, 'El contenido del mensaje no debe exceder los 2000 caracteres.').optional(),
    // id_foro, autor_uid, fecha_creacion are not updatable
}).strict('Campos no permitidos en la actualización del mensaje.');

module.exports = {
    createForumMessageSchema,
    updateForumMessageSchema
};