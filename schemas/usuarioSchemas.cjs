const { z } = require('zod');

// Schema for creating a new user's profile data
// Assumes UID comes from Firebase Auth and is used as the document ID
const createUserSchema = z.object({
    username: z.string().min(3, 'El nombre de usuario debe tener al menos 3 caracteres.'),
    email: z.string().email('Formato de correo electrónico inválido.'),
    rol: z.enum(['usuario', 'suscriptor', 'admin']).default('usuario'),
    // password is NOT included here as Firebase Auth handles it
});

// Schema for updating user data
// All fields are optional as it's a partial update (PATCH/PUT)
const updateUserSchema = z.object({
    username: z.string().min(3, 'El nombre de usuario debe tener al menos 3 caracteres.').optional(),
    email: z.string().email('Formato de correo electrónico inválido.').optional(),
    rol: z.enum(['usuario', 'suscriptor', 'admin']).optional(),
    // exp and suscripcion would have their own dedicated update endpoints or schemas
}).strict('Campos no permitidos en la actualización del usuario.'); // Strict to disallow unknown fields

// Schema for updating subscription status
const updateSubscriptionSchema = z.object({
    suscrito: z.boolean(),
    fecha_inicio: z.string().datetime().nullable().optional(), // Expects ISO string for dates
    fecha_fin: z.string().datetime().nullable().optional(), // Expects ISO string for dates
}).strict('Campos no permitidos en la actualización de la suscripción.');

// Schema for updating experience points
const updateExperienceSchema = z.object({
    actual: z.number().int().min(0, 'La experiencia actual no puede ser negativa.'),
    anterior: z.number().int().min(0, 'La experiencia anterior no puede ser negativa.'),
}).strict('Campos no permitidos en la actualización de la experiencia.');

module.exports = {
    createUserSchema,
    updateUserSchema,
    updateSubscriptionSchema,
    updateExperienceSchema
};