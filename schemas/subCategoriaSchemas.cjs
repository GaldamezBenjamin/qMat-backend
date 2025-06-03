const { z } = require('zod');

// Schema for creating a new subcategory
const createSubCategorySchema = z.object({
    nombre: z.string().min(3, 'El nombre de la subcategoría debe tener al menos 3 caracteres.'),
    id_categoria: z.string().min(1, 'El ID de la categoría es obligatorio.'), // Must be a non-empty string
}).strict('Campos no permitidos en la creación de la subcategoría.');

// Schema for updating an existing subcategory
const updateSubCategorySchema = z.object({
    nombre: z.string().min(3, 'El nombre de la subcategoría debe tener al menos 3 caracteres.').optional(),
    id_categoria: z.string().min(1, 'El ID de la categoría es obligatorio.').optional(),
}).strict('Campos no permitidos en la actualización de la subcategoría.');

module.exports = {
    createSubCategorySchema,
    updateSubCategorySchema,
};