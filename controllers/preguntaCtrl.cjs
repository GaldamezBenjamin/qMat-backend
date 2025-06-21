const { db } = require('../config/firebase.cjs');
const { createQuestionSchema, updateQuestionSchema } = require('../schemas/preguntaSchemas.cjs');
const { z } = require('zod');

// Get all questions (can be filtered by id_subcategoria)
exports.getAllQuestions = async (req, res) => {
    try {
        const { id_subcategoria } = req.query; // Allow filtering by subcategory
        let questionsRef = db.collection('preguntas');

        if (id_subcategoria) {
            questionsRef = questionsRef.where('id_subcategoria', '==', id_subcategoria);
        }

        const snapshot = await questionsRef.get();

        if (snapshot.empty) {
            return res.status(404).json({ message: 'No se encontraron preguntas.' });
        }

        const questions = [];
        snapshot.forEach(doc => {
            questions.push({
                id_pregunta: doc.id,
                ...doc.data()
            });
        });
        res.status(200).json(questions);
    } catch (error) {
        console.error('Error al obtener preguntas:', error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Get question by ID
exports.getQuestionById = async (req, res) => {
    try {
        const { id_pregunta } = req.params;
        const questionRef = db.collection('preguntas').doc(id_pregunta);
        const doc = await questionRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: `Pregunta con ID ${id_pregunta} no encontrada.` });
        }

        res.status(200).json({ id_pregunta: doc.id, ...doc.data() });
    } catch (error) {
        console.error(`Error al obtener pregunta con ID ${req.params.id_pregunta}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Create a new question
// Only accessible by admin users
exports.createQuestion = async (req, res) => {
    try {
        // Añadir 'explicacion' a la desestructuración del cuerpo de la petición
        const { enunciado, dificultad, opciones, id_subcategoria, explicacion } = req.body;

        // Validar el cuerpo de la petición con Zod, incluyendo 'explicacion'
        const validatedData = createQuestionSchema.parse({ enunciado, dificultad, opciones, id_subcategoria, explicacion });

        // Verify if id_subcategoria exists in the 'sub_categorias' collection
        const subCategoryRef = db.collection('sub_categorias').doc(validatedData.id_subcategoria);
        const subCategoryDoc = await subCategoryRef.get();

        if (!subCategoryDoc.exists) {
            return res.status(400).json({ message: `La subcategoría con ID ${validatedData.id_subcategoria} no existe.` });
        }

        const newQuestionRef = db.collection('preguntas').doc(); // Auto-generate ID
        // Guardar todos los datos validados, incluyendo 'explicacion'
        await newQuestionRef.set(validatedData);

        res.status(201).json({ message: 'Pregunta creada exitosamente.', id_pregunta: newQuestionRef.id, question: validatedData });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Datos de entrada inválidos.', errors: error.errors });
        }
        console.error('Error al crear pregunta:', error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Update an existing question
// Only accessible by admin users
exports.updateQuestion = async (req, res) => {
    try {
        const { id_pregunta } = req.params;
        const updates = req.body; // 'updates' ya contiene todos los campos enviados, incluyendo 'explicacion' si se envía

        // Validar el cuerpo de la petición con Zod. updateQuestionSchema ya incluye 'explicacion' como opcional.
        const validatedUpdates = updateQuestionSchema.parse(updates);

        const questionRef = db.collection('preguntas').doc(id_pregunta);
        const doc = await questionRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: `Pregunta con ID ${id_pregunta} no encontrada.` });
        }

        // If id_subcategoria is being updated, verify its existence
        if (validatedUpdates.id_subcategoria && validatedUpdates.id_subcategoria !== doc.data().id_subcategoria) {
            const subCategoryRef = db.collection('sub_categorias').doc(validatedUpdates.id_subcategoria);
            const subCategoryDoc = await subCategoryRef.get();
            if (!subCategoryDoc.exists) {
                return res.status(400).json({ message: `La nueva subcategoría con ID ${validatedUpdates.id_subcategoria} no existe.` });
            }
        }

        // Actualizar el documento con los datos validados. 'explicacion' se incluirá si está presente en 'validatedUpdates'.
        await questionRef.update(validatedUpdates);
        res.status(200).json({ message: 'Pregunta actualizada exitosamente.' });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Datos de entrada inválidos.', errors: error.errors });
        }
        console.error(`Error al actualizar pregunta con ID ${req.params.id_pregunta}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Delete a question
// Only accessible by admin users
exports.deleteQuestion = async (req, res) => {
    try {
        const { id_pregunta } = req.params;
        const questionRef = db.collection('preguntas').doc(id_pregunta);
        const doc = await questionRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: `Pregunta con ID ${id_pregunta} no encontrada.` });
        }

        await questionRef.delete();
        res.status(200).json({ message: 'Pregunta eliminada exitosamente.' });
    } catch (error) {
        console.error(`Error al eliminar pregunta con ID ${req.params.id_pregunta}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Generate questions for a quiz
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

/**
 * Función auxiliar para extraer una subcadena JSON (asumiendo un objeto JSON singular) de un texto.
 * Intenta encontrar el primer '{' y el último '}' para parsear,
 * y luego limpia las cercas de Markdown si están presentes.
 *
 * @param {string} text - El texto completo devuelto por la IA.
 * @returns {string|null} La subcadena JSON limpia o null si no se encuentra un JSON válido.
 */
function extractJsonObjectSubstring(text) {
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    return null;
  }

  let jsonSubstring = text.substring(firstBrace, lastBrace + 1);

  // Limpiar cercas de Markdown si existen
  if (jsonSubstring.startsWith('```json')) {
    jsonSubstring = jsonSubstring.substring(7);
  } else if (jsonSubstring.startsWith('```')) {
    jsonSubstring = jsonSubstring.substring(3);
  }
  if (jsonSubstring.endsWith('```')) {
    jsonSubstring = jsonSubstring.slice(0, -3);
  }

  return jsonSubstring.trim();
}

/**
 * Función auxiliar para generar una única pregunta usando la IA.
 * Construye el prompt con los detalles del quiz y el formato de salida esperado.
 *
 * @param {string} quizTitulo - El título del quiz para el que se genera la pregunta.
 * @param {string} subcategoria - La subcategoría a la que pertenece el quiz.
 * @param {string} idSubcategoria - El ID de la subcategoría.
 * @param {string} dificultad - La dificultad deseada para la pregunta.
 * @returns {Promise<object>} Una promesa que resuelve con el objeto de la pregunta generada o rechaza con un error.
 */
async function generarUnaPregunta(quizTitulo, subcategoria, idSubcategoria, dificultad) {
  const prompt = `Genera una pregunta de quiz sobre el tema "${quizTitulo}" que pertenece a la subcategoría de MATEMÁTICAS "${subcategoria}".
La pregunta debe tener una dificultad de **${dificultad}**.

El formato de salida debe ser un objeto JSON estricto con las siguientes propiedades:
- **enunciado**: (string) El texto de la pregunta.
- **dificultad**: (string) La dificultad de la pregunta (debe ser "${dificultad}").
- **opciones**: (object) Un objeto con 4 opciones (a, b, c, d) y una propiedad 'correcta' indicando la letra de la opción correcta.
  - a: (string) Texto de la opción A.
  - b: (string) Texto de la opción B.
  - c: (string) Texto de la opción C.
  - d: (string) Texto de la opción D.
  - correcta: (string) La letra de la opción correcta (ej. "a").
- **explicacion**: (string) Una explicación concisa (máximo 2-3 oraciones) de por qué la opción correcta es la respuesta.

Asegúrate de que la respuesta sea solo el objeto JSON, sin texto adicional antes o después.

Ejemplo de estructura de salida:
{
  "enunciado": "¿Cuál es la derivada de la función f(x) = x^2?",
  "dificultad": "baja",
  "opciones": {
    "a": "2x",
    "b": "x",
    "c": "x^3/3",
    "d": "2",
    "correcta": "a"
  },
  "explicacion": "La derivada de x^n es n*x^(n-1). Para x^2, n es 2, por lo que la derivada es 2x."
}
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let rawResponseText = response.text().trim();

    const cleanedJsonString = extractJsonObjectSubstring(rawResponseText);

    if (cleanedJsonString === null) {
      console.error(`No se pudo encontrar un objeto JSON válido en la respuesta de la IA. Respuesta original: ${rawResponseText}`);
      throw new Error('La IA no devolvió un objeto JSON válido o la estructura no se pudo extraer.');
    }

    let preguntaParseada;
    try {
      preguntaParseada = JSON.parse(cleanedJsonString);
    } catch (jsonParseError) {
      console.error(`Error al parsear el JSON extraído:`, jsonParseError);
      throw new Error(`La IA devolvió un formato JSON inválido: ${jsonParseError.message}. Contenido: ${cleanedJsonString}`);
    }

    if (!preguntaParseada || !preguntaParseada.enunciado || !preguntaParseada.opciones || !preguntaParseada.explicacion) {
      console.error('La estructura de la pregunta generada por la IA es inválida:', preguntaParseada);
      throw new Error('La IA generó una pregunta con una estructura JSON inesperada.');
    }

    preguntaParseada.id_subcategoria = idSubcategoria;

    return preguntaParseada;
  } catch (error) {
    console.error(`Error en generarUnaPregunta para ${quizTitulo}:`, error.message);
    throw error;
  }
}

/**
 * Endpoint para generar preguntas para un conjunto de quizzes.
 * Recibe un JSON con detalles de quizzes, dificultades y cantidades.
 * Genera preguntas para cada quiz dentro del rango de cantidad_minima y cantidad_maxima.
 * Las preguntas generadas se devuelven al frontend y NO se guardan automáticamente.
 *
 * @param {object} req - Objeto de solicitud de Express.
 * Espera body: {
 * "dificultades": ["media", "baja", "muy alta"],
 * "cantidad_minima": 4,
 * "cantidad_maxima": 18,
 * "quizzes": {
 * "Trigonometría I": { "subcategoria": "Funciones trigonométricas", "id_subcategoria": "g3VyIYjCRTSG0anxUyo6" },
 * // ... otros quizzes
 * }
 * }
 * @param {object} res - Objeto de respuesta de Express.
 */
exports.generateQuizQuestions = async (req, res) => {
  const { dificultades, cantidad_minima, cantidad_maxima, quizzes } = req.body;

  // Validaciones de la entrada, incluyendo las nuevas cantidades
  if (!dificultades || !Array.isArray(dificultades) || dificultades.length === 0) {
    return res.status(400).json({ message: 'El campo "dificultades" es requerido y debe ser un array no vacío.' });
  }
  if (!quizzes || typeof quizzes !== 'object' || Object.keys(quizzes).length === 0) {
    return res.status(400).json({ message: 'El campo "quizzes" es requerido y debe ser un objeto no vacío.' });
  }
  if (typeof cantidad_minima !== 'number' || cantidad_minima < 1) {
    return res.status(400).json({ message: 'El campo "cantidad_minima" es requerido y debe ser un número mayor o igual a 1.' });
  }
  if (typeof cantidad_maxima !== 'number' || cantidad_maxima < cantidad_minima) {
    return res.status(400).json({ message: 'El campo "cantidad_maxima" es requerido y debe ser un número mayor o igual a "cantidad_minima".' });
  }

  const generatedQuestions = [];

  console.log(`Iniciando generación de preguntas para ${Object.keys(quizzes).length} quizzes.`);

  for (const quizTitulo in quizzes) {
    const quizInfo = quizzes[quizTitulo];
    const { subcategoria, id_subcategoria } = quizInfo;

    // Calcular la cantidad de preguntas a generar para este quiz
    // Genera un número aleatorio entre cantidad_minima y cantidad_maxima (inclusive)
    const numQuestionsToGenerate = Math.floor(Math.random() * (cantidad_maxima - cantidad_minima + 1)) + cantidad_minima;

    console.log(`Generando ${numQuestionsToGenerate} preguntas para: "${quizTitulo}" (Subcategoría: "${subcategoria}")`);

    for (let i = 0; i < numQuestionsToGenerate; i++) {
      // Seleccionar una dificultad aleatoria para cada pregunta
      const dificultadSeleccionada = dificultades[Math.floor(Math.random() * dificultades.length)];

      console.log(`  > Solicitando pregunta ${i + 1}/${numQuestionsToGenerate} con dificultad: "${dificultadSeleccionada}"`);

      try {
        const nuevaPregunta = await generarUnaPregunta(quizTitulo, subcategoria, id_subcategoria, dificultadSeleccionada);
        generatedQuestions.push({
          status: 'success',
          quizTitulo: quizTitulo, // Para que el frontend sepa a qué quiz pertenece
          data: nuevaPregunta
        });
        console.log(`  > Pregunta ${i + 1} para "${quizTitulo}" generada exitosamente.`);

        // Pequeño retraso para evitar sobrecargar la API y ser más amigables con las cuotas.
        await new Promise(resolve => setTimeout(resolve, 1500)); // Espera 1.5 segundos
      } catch (error) {
        console.error(`  > Error al generar pregunta ${i + 1} para "${quizTitulo}":`, error.message);
        generatedQuestions.push({
          status: 'failed',
          quizTitulo: quizTitulo,
          reason: error.message,
          subcategoria: subcategoria, // Incluir información para depuración
          id_subcategoria: idSubcategoria
        });
        // Continuar con la siguiente pregunta o quiz a pesar del error de una
      }
    }
  }

  // Si no se generó ninguna pregunta exitosamente
  if (generatedQuestions.length === 0 || generatedQuestions.every(q => q.status === 'failed')) {
    return res.status(500).json({
      message: 'No se pudieron generar preguntas válidas para ninguno de los quizzes o todas fallaron.',
      results: generatedQuestions
    });
  }

  res.status(200).json({
    message: 'Generación de preguntas completada. Revísalas antes de guardar.',
    questions: generatedQuestions
  });
};