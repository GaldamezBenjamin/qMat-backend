const { db } = require("../config/firebase.cjs");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();
const {
  createQuizSchema,
  updateQuizSchema,
} = require("../schemas/quizSchemas.cjs");
const { z } = require("zod");

// --- Función auxiliar para calcular la subcategoría principal de un quiz ---
async function calculateMainSubcategory(questionIds) {
  if (!questionIds || questionIds.length === 0) {
    return null; // No hay preguntas, no hay subcategoría principal
  }

  const subcategoryCounts = {};
  let maxCount = 0;
  let mainSubcategoryId = null;

  // Fetch all relevant subcategories efficiently (if questions are many, optimize this batch)
  // For simplicity, fetching all questions first, then their subcategories.
  const questionPromises = questionIds.map((id) =>
    db.collection("preguntas").doc(id).get()
  );
  const questionDocs = await Promise.all(questionPromises);

  const subcategoryIds = new Set(); // Para recolectar solo IDs únicos de subcategorías
  questionDocs.forEach((doc) => {
    if (doc.exists && doc.data().id_subcategoria) {
      const subId = doc.data().id_subcategoria;
      subcategoryCounts[subId] = (subcategoryCounts[subId] || 0) + 1;
      subcategoryIds.add(subId); // Añadir al set de IDs únicas

      if (subcategoryCounts[subId] > maxCount) {
        maxCount = subcategoryCounts[subId];
        mainSubcategoryId = subId;
      }
    }
  });

  if (!mainSubcategoryId) {
    return null; // No se encontró ninguna subcategoría válida en las preguntas
  }

  // Obtener el nombre de la subcategoría más común
  const mainSubcategoryDoc = await db
    .collection("sub_categorias")
    .doc(mainSubcategoryId)
    .get();
  if (mainSubcategoryDoc.exists) {
    return {
      id: mainSubcategoryDoc.id,
      nombre: mainSubcategoryDoc.data().nombre,
    };
  }

  return null; // No se encontró el documento de la subcategoría principal
}

// Get all quizzes (Accessible to all authenticated users)
exports.getAllQuizzes = async (req, res) => {
  try {
    const quizzesRef = db.collection("quizzes");
    const snapshot = await quizzesRef.get();

    if (snapshot.empty) {
      return res.status(404).json({ message: "No se encontraron quizzes." });
    }

    const quizzes = [];
    snapshot.forEach((doc) => {
      quizzes.push({
        id_quiz: doc.id,
        ...doc.data(),
      });
    });
    res.status(200).json(quizzes);
  } catch (error) {
    console.error("Error al obtener quizzes:", error);
    res
      .status(500)
      .json({ message: "Error interno del servidor.", error: error.message });
  }
};

// Get quiz by ID (Accessible to all authenticated users)
exports.getQuizById = async (req, res) => {
  try {
    const { id_quiz } = req.params;
    const quizRef = db.collection("quizzes").doc(id_quiz);
    const doc = await quizRef.get();

    if (!doc.exists) {
      return res
        .status(404)
        .json({ message: `Quiz con ID ${id_quiz} no encontrado.` });
    }

    res.status(200).json({ id_quiz: doc.id, ...doc.data() });
  } catch (error) {
    console.error(`Error al obtener quiz con ID ${req.params.id_quiz}:`, error);
    res
      .status(500)
      .json({ message: "Error interno del servidor.", error: error.message });
  }
};

// Get all questions for a specific quiz (Accessible to all authenticated users)
exports.getQuestionsByQuizId = async (req, res) => {
  try {
    const { id_quiz } = req.params;

    // 1. Get the quiz document to retrieve its question IDs
    const quizRef = db.collection("quizzes").doc(id_quiz);
    const quizDoc = await quizRef.get();

    if (!quizDoc.exists) {
      return res
        .status(404)
        .json({ message: `Quiz con ID ${id_quiz} no encontrado.` });
    }

    const quizData = quizDoc.data();
    const questionIds = quizData.id_preguntas;

    // Handle case where a quiz might not have questions yet (though your schema ensures it does)
    if (!questionIds || questionIds.length === 0) {
      return res.status(200).json({
        message: `El quiz con ID ${id_quiz} no tiene preguntas asignadas.`,
        questions: [],
      });
    }

    // 2. Fetch all question documents individually and in parallel
    //    This is the most robust approach for >10 IDs
    const questionPromises = questionIds.map(async (questionId) => {
      const questionDoc = await db
        .collection("preguntas")
        .doc(questionId)
        .get();
      if (questionDoc.exists) {
        return {
          id_pregunta: questionDoc.id,
          ...questionDoc.data(),
        };
      }
      // If a question ID doesn't exist, you might choose to
      // skip it, return null, or throw an error depending on your needs.
      // For now, we'll just skip it (return undefined, which Promise.all filters out).
      return undefined;
    });

    const questions = (await Promise.all(questionPromises)).filter(
      (q) => q !== undefined
    );

    // Optional: If you need to ensure all questions were found, check `questions.length`
    if (questions.length !== questionIds.length) {
      console.warn(
        `Advertencia: Se esperaban ${questionIds.length} preguntas, pero se encontraron ${questions.length} para el quiz ${id_quiz}.`
      );
      // You might choose to return a 404 or a warning here if a mismatch is critical.
    }

    res.status(200).json(questions);
  } catch (error) {
    console.error(
      `Error al obtener preguntas para el quiz con ID ${req.params.id_quiz}:`,
      error
    );
    res
      .status(500)
      .json({ message: "Error interno del servidor.", error: error.message });
  }
};

// Create a new quiz (Admin only)
exports.createQuiz = async (req, res) => {
  try {
    const {
      nombre,
      dificultad,
      cantidad_preguntas,
      tiempo_estimado,
      id_preguntas,
    } = req.body;

    // Validate request body with Zod
    const validatedData = createQuizSchema.parse({
      nombre,
      dificultad,
      cantidad_preguntas,
      tiempo_estimado,
      id_preguntas,
    });

    // Basic check: Ensure cantidad_preguntas matches id_preguntas array length
    if (
      validatedData.cantidad_preguntas !== validatedData.id_preguntas.length
    ) {
      return res.status(400).json({
        message:
          "La cantidad de preguntas debe coincidir con el número de IDs de preguntas proporcionados.",
      });
    }

    // Verify if all question IDs exist in the 'preguntas' collection
    const questionChecks = validatedData.id_preguntas.map(
      async (questionId) => {
        const questionDoc = await db
          .collection("preguntas")
          .doc(questionId)
          .get();
        if (!questionDoc.exists) {
          throw new Error(`La pregunta con ID ${questionId} no existe.`);
        }
      }
    );
    await Promise.all(questionChecks);

    const mainSubcategory = await calculateMainSubcategory(
      validatedData.id_preguntas
    );

    const newQuizRef = db.collection("quizzes").doc();
    await newQuizRef.set({
      ...validatedData,
      main_subcategory: mainSubcategory,
    });

    res.status(201).json({
      message: "Quiz creado exitosamente.",
      id_quiz: newQuizRef.id,
      quiz: { ...validatedData, main_subcategory: mainSubcategory },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ message: "Datos de entrada inválidos.", errors: error.errors });
    }
    console.error("Error al crear quiz:", error);
    // Custom error for non-existent questions
    if (error.message.includes("La pregunta con ID")) {
      return res.status(400).json({ message: error.message });
    }
    res
      .status(500)
      .json({ message: "Error interno del servidor.", error: error.message });
  }
};

// Update an existing quiz (Admin only)
exports.updateQuiz = async (req, res) => {
  try {
    const { id_quiz } = req.params;
    const updates = req.body;

    // Validate request body with Zod
    const validatedUpdates = updateQuizSchema.parse(updates);

    const quizRef = db.collection("quizzes").doc(id_quiz);
    const doc = await quizRef.get();

    if (!doc.exists) {
      return res
        .status(404)
        .json({ message: `Quiz con ID ${id_quiz} no encontrado.` });
    }

    const currentQuizData = doc.data(); // Obtener los datos actuales del quiz

    let newMainSubcategory = currentQuizData.main_subcategory || null; // Mantener la existente por defecto
    let shouldRecalculateSubcategory = false;

    // Si id_preguntas se está actualizando, necesitamos recalcular la subcategoría principal
    if (
      validatedUpdates.id_preguntas &&
      validatedUpdates.id_preguntas.length > 0
    ) {
      if (
        validatedUpdates.cantidad_preguntas &&
        validatedUpdates.cantidad_preguntas !==
          validatedUpdates.id_preguntas.length
      ) {
        return res.status(400).json({
          message:
            "La cantidad de preguntas debe coincidir con el número de IDs de preguntas proporcionados.",
        });
      } else if (
        !validatedUpdates.cantidad_preguntas &&
        validatedUpdates.id_preguntas.length !==
          currentQuizData.cantidad_preguntas
      ) {
        return res.status(400).json({
          message:
            "El número de IDs de preguntas no coincide con la cantidad de preguntas existente en el quiz.",
        });
      }

      const questionChecks = validatedUpdates.id_preguntas.map(
        async (questionId) => {
          const questionDoc = await db
            .collection("preguntas")
            .doc(questionId)
            .get();
          if (!questionDoc.exists) {
            throw new Error(`La pregunta con ID ${questionId} no existe.`);
          }
        }
      );
      await Promise.all(questionChecks);

      shouldRecalculateSubcategory = true; // Indicar que hay que recalcular
    } else if (
      validatedUpdates.cantidad_preguntas &&
      validatedUpdates.cantidad_preguntas !==
        currentQuizData.id_preguntas.length
    ) {
      return res.status(400).json({
        message:
          "La cantidad de preguntas actualizada debe coincidir con el número de IDs de preguntas existentes.",
      });
    }

    // Si se debe recalcular, hazlo
    if (shouldRecalculateSubcategory) {
      newMainSubcategory = await calculateMainSubcategory(
        validatedUpdates.id_preguntas || currentQuizData.id_preguntas
      );
    }

    // Aplicar la actualización al quiz, incluyendo la nueva subcategoría principal
    await quizRef.update({
      ...validatedUpdates,
      main_subcategory: newMainSubcategory, // Actualizar con la nueva (o misma) subcategoría principal
    });

    res.status(200).json({ message: "Quiz actualizado exitosamente." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ message: "Datos de entrada inválidos.", errors: error.errors });
    }
    console.error(
      `Error al actualizar quiz con ID ${req.params.id_quiz}:`,
      error
    );
    if (error.message.includes("La pregunta con ID")) {
      return res.status(400).json({ message: error.message });
    }
    res
      .status(500)
      .json({ message: "Error interno del servidor.", error: error.message });
  }
};

// Delete a quiz (Admin only)
exports.deleteQuiz = async (req, res) => {
  try {
    const { id_quiz } = req.params;
    const quizRef = db.collection("quizzes").doc(id_quiz);
    const doc = await quizRef.get();

    if (!doc.exists) {
      return res
        .status(404)
        .json({ message: `Quiz con ID ${id_quiz} no encontrado.` });
    }

    await quizRef.delete();
    res.status(200).json({ message: "Quiz eliminado exitosamente." });
  } catch (error) {
    console.error(
      `Error al eliminar quiz con ID ${req.params.id_quiz}:`,
      error
    );
    res
      .status(500)
      .json({ message: "Error interno del servidor.", error: error.message });
  }
};

// Generate a quiz using Google Generative AI (Admin only)
const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" }); // Puedes usar gemini-1.5-pro si necesitas más complejidad

/**
 * Función auxiliar para extraer una subcadena JSON de un texto.
 * Intenta encontrar el primer '{' y el último '}' para parsear,
 * y luego limpia las cercas de Markdown si están presentes.
 *
 * @param {string} text - El texto completo devuelto por la IA.
 * @returns {string|null} La subcadena JSON limpia o null si no se encuentra un JSON válido.
 */
function extractJsonSubstring(text) {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');

    // Asegurarse de que hay al menos un par de llaves y que el corchete de cierre no esté antes del de apertura
    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
        return null; // No se encontró una estructura de objeto JSON básica
    }

    let jsonSubstring = text.substring(firstBrace, lastBrace + 1);

    // Limpiar cercas de Markdown si existen dentro de la subcadena
    // Esto es útil si la IA pone texto antes/después del JSON pero DENTRO de las cercas, o al revés.
    if (jsonSubstring.startsWith('```json')) {
        jsonSubstring = jsonSubstring.substring(7); // Elimina '```json'
    } else if (jsonSubstring.startsWith('```')) {
        jsonSubstring = jsonSubstring.substring(3); // Elimina '```'
    }
    if (jsonSubstring.endsWith('```')) {
        jsonSubstring = jsonSubstring.slice(0, -3); // Elimina el '```' final
    }

    return jsonSubstring.trim();
}


/**
 * Función auxiliar para extraer una subcadena JSON (asumiendo un array JSON) de un texto.
 * Intenta encontrar el primer '[' y el último ']' para parsear,
 * y luego limpia las cercas de Markdown si están presentes.
 *
 * @param {string} text - El texto completo devuelto por la IA.
 * @returns {string|null} La subcadena JSON limpia o null si no se encuentra un JSON válido.
 */
function extractJsonSubstring(text) {
    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');

    // Asegurarse de que hay al menos un par de corchetes y que el corchete de cierre no esté antes del de apertura
    if (firstBracket === -1 || lastBracket === -1 || lastBracket < firstBracket) {
        return null; // No se encontró una estructura de array JSON básica
    }

    let jsonSubstring = text.substring(firstBracket, lastBracket + 1);

    // Limpiar cercas de Markdown si existen dentro de la subcadena
    if (jsonSubstring.startsWith('```json')) {
        jsonSubstring = jsonSubstring.substring(7); // Elimina '```json'
    } else if (jsonSubstring.startsWith('```')) {
        jsonSubstring = jsonSubstring.substring(3); // Elimina '```'
    }
    if (jsonSubstring.endsWith('```')) {
        jsonSubstring = jsonSubstring.slice(0, -3); // Elimina el '```' final
    }

    return jsonSubstring.trim();
}


/**
 * Genera nombres de quizzes basados en una subcategoría y cantidad especificadas.
 * La IA generará directamente la cantidad solicitada de nombres en una sola respuesta.
 * Los quizzes generados se devuelven al frontend y NO se guardan automáticamente en Firebase.
 *
 * @param {object} req - Objeto de solicitud de Express. Espera body: { subcategoria: string, cantidad: number }.
 * @param {object} res - Objeto de respuesta de Express.
 */
exports.generateQuizNames = async (req, res) => {
    const { subcategoria, cantidad } = req.body;

    if (!subcategoria || typeof subcategoria !== 'string' || subcategoria.trim() === '') {
        return res.status(400).json({ message: 'El campo "subcategoría" es requerido y debe ser un string válido.' });
    }
    if (!cantidad || typeof cantidad !== 'number' || cantidad < 1 || cantidad > 10) {
        return res.status(400).json({ message: 'La "cantidad" de nombres de quizzes debe ser un número entre 1 y 10.' });
    }

    // --- PROMPT MODIFICADO (SOLICITA MÚLTIPLES NOMBRES EN UN ARRAY) ---
    const prompt = `Genera ${cantidad} nombres muy cortos (máximo 4 palabras cada uno) para quizzes de MATEMÁTICAS de práctica para la PAES M1 o M2.
    Cada nombre debe ser **directamente relacionado al concepto matemático de la subcategoría "${subcategoria}"**, específico y profesional.
    **EVITA ABSOLUTAMENTE** usar palabras como "Práctica", "Quiz", "Examen", "Test", "Evaluación", "Repaso", "Lección" en los nombres.
    No uses palabras genéricas o vagas. Cada nombre debe ser claro y específico al tema de la subcategoría.
    Los nombres no deben repetirse entre sí, cada uno debe ser único y específico al tema de la subcategoría.
    No uses palabras como "Matemáticas", "Matemática", "Matemáticas PAES", "Matemática PAES" o similares, ya que el contexto es claro.
    Enfócate en el tema. Puedes incluir números romanos (I, II, III) si hay niveles o partes del mismo tema.
		**EVITA ABSOLUTAMENTE** repetir palabras/frases como "Complejo", "de Complejo", "de Funciones", "de Ecuaciones", "de Geometría", "de Álgebra", etc.

    Quiero que la salida sea *solamente* un array JSON de objetos, donde cada objeto tenga **una única propiedad 'nombre'**.
    Ejemplo de salida para cantidad = 2:
    [
        {"nombre": "Logaritmos PAES"},
        {"nombre": "Ecuaciones Lineales"}
    ]
    `;

    console.log(`Solicitando ${cantidad} nombres de quiz sobre subcategoría: ${subcategoria}`);

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let rawResponseText = response.text().trim(); // Guardar la respuesta original

        const cleanedJsonString = extractJsonSubstring(rawResponseText);

        if (cleanedJsonString === null) {
            console.error(`No se pudo encontrar un array JSON válido en la respuesta de la IA. Respuesta original: ${rawResponseText}`);
            return res.status(500).json({
                message: 'La IA no devolvió un array JSON válido o la estructura no se pudo extraer.',
                rawResponse: rawResponseText
            });
        }

        let parsedQuizNames;
        try {
            parsedQuizNames = JSON.parse(cleanedJsonString);
        } catch (jsonParseError) {
            console.error(`Error al parsear el JSON extraído:`, jsonParseError);
            return res.status(500).json({
                message: `La IA devolvió un formato JSON inválido después de la extracción: ${jsonParseError.message}`,
                rawResponse: cleanedJsonString // Aquí mostramos el string que intentamos parsear
            });
        }

        if (!Array.isArray(parsedQuizNames)) {
            console.error(`La IA no devolvió un array JSON como se esperaba. Tipo: ${typeof parsedQuizNames}. Contenido:`, parsedQuizNames);
            return res.status(500).json({
                message: 'La IA no devolvió un array JSON como se esperaba, devolvió un objeto singular o algo diferente.',
                data: parsedQuizNames, // Devolver lo que la IA realmente dio
                rawResponse: rawResponseText
            });
        }

        const quizNamesGenerated = [];
        for (const item of parsedQuizNames) {
            if (typeof item.nombre === 'string' && item.nombre.trim() !== '') {
                quizNamesGenerated.push({
                    status: 'success',
                    data: {
                        nombre: item.nombre,
                        subcategoria: subcategoria
                    }
                });
            } else {
                console.warn(`La IA generó un elemento sin una propiedad 'nombre' válida en el array:`, item);
                quizNamesGenerated.push({
                    status: 'failed',
                    reason: 'Un elemento en el array generado por la IA no contiene una propiedad "nombre" válida.',
                    data: item,
                    rawResponse: rawResponseText
                });
            }
        }

        if (quizNamesGenerated.length === 0) {
             return res.status(400).json({
                message: 'La IA no pudo generar nombres de quizzes válidos para la subcategoría y cantidad solicitadas.',
                rawResponse: rawResponseText
            });
        }


        res.status(200).json({
            message: 'Generación de nombres de quizzes completada. Revísalos antes de guardar.',
            quizzes: quizNamesGenerated // Se sigue llamando 'quizzes' para compatibilidad con el frontend
        });

    } catch (error) {
        console.error('Error general durante la generación de nombres de quizzes:', error);
        res.status(500).json({ message: 'Error interno del servidor al generar nombres de quizzes.', error: error.message });
    }
};