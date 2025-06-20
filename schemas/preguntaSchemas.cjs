// schemas/preguntaSchemas.cjs
const { z } = require("zod");

// Schema for the 'opciones' nested object
const opcionesSchema = z
  .object({
    a: z.string().min(1, 'La opción "a" no puede estar vacía.'),
    b: z.string().min(1, 'La opción "b" no puede estar vacía.'),
    c: z.string().min(1, 'La opción "c" no puede estar vacía.'),
    d: z.string().min(1, 'La opción "d" no puede estar vacía.'),
    correcta: z.enum(["a", "b", "c", "d"], {
      errorMap: () => ({
        message: "La opción correcta debe ser 'a', 'b', 'c' o 'd'.",
      }),
    }),
  })
  .strict("Campos no permitidos en las opciones.");

// Schema for creating a new question
const createQuestionSchema = z
  .object({
    enunciado: z
      .string()
      .min(
        10,
        "El enunciado de la pregunta debe tener al menos 10 caracteres."
      ),
    dificultad: z.enum(["Baja", "Media", "Alta", "Muy Alta"], {
      errorMap: () => ({
        message: "La dificultad debe ser 'Baja', 'Media', 'Alta' o 'Muy Alta'.",
      }),
    }),
    opciones: opcionesSchema, // Use the nested schema
    id_subcategoria: z
      .string()
      .min(1, "El ID de la subcategoría es obligatorio."),
    // --- Nuevo campo: explicacion ---
    explicacion: z
      .string()
      .min(1, "La explicación no puede estar vacía.")
      .optional(), // Hice que requiera al menos 1 caracter si está presente
  })
  .strict("Campos no permitidos en la creación de la pregunta.");

// Schema for updating an existing question
// Allows partial updates for 'enunciado', 'dificultad', 'opciones', 'id_subcategoria'
const updateQuestionSchema = z
  .object({
    enunciado: z
      .string()
      .min(10, "El enunciado de la pregunta debe tener al menos 10 caracteres.")
      .optional(),
    dificultad: z
      .enum(["Baja", "Media", "Alta", "Muy Alta"], {
        errorMap: () => ({
          message:
            "La dificultad debe ser 'Baja', 'Media', 'Alta' o 'Muy Alta'.",
        }),
      })
      .optional(),
    opciones: opcionesSchema.optional(), // Allows updating the entire options object
    id_subcategoria: z
      .string()
      .min(1, "El ID de la subcategoría es obligatorio.")
      .optional(),
    // --- Nuevo campo opcional para actualizar ---
    explicacion: z
      .string()
      .min(1, "La explicación no puede estar vacía.")
      .optional(),
  })
  .strict("Campos no permitidos en la actualización de la pregunta.");

module.exports = {
  createQuestionSchema,
  updateQuestionSchema,
};
