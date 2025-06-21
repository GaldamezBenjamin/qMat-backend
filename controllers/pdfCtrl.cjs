// controllers/pdfCtrl.cjs
const fs = require('fs');
const pdf = require('pdf-parse'); // Para extraer texto plano del PDF
const { GoogleGenerativeAI } = require('@google/generative-ai'); // Cliente Gemini
require('dotenv').config(); // Para cargar variables de entorno

// Inicialización de la API de Gemini
const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Modelo de IA a usar

/**
 * Mapeo de prompts para diferentes tipos de extracción.
 * Esto permite escalar para diferentes formatos de PDF y necesidades de extracción.
 * Cada clave es un 'tipo' de extracción (ej. 'temario_m1', 'cuestionario').
 * Cada valor es una función que genera el prompt específico para la IA.
 */
const EXTRACTION_PROMPTS = {
    temario_m1: (extractedText) => `Dada la siguiente lista de datos extraídos de un documento PDF de temario de PAES M1, quiero que me devuelvas una lista de objetos JSON. Cada objeto debe representar una entrada del temario y contener **solamente** las propiedades 'categoria' y 'sub_categoria'.

    **Instrucciones clave:**
    - Agrupa los valores que lógicamente pertenecen a la misma entrada.
    - Si una entrada es muy corta o parece ser un fragmento de una entrada anterior o posterior, intenta combinarla apropiadamente.
    - Ignora cualquier información que parezca ser una "descripción" detallada o una viñeta.
    - **No incluyas la propiedad 'descripcion' en la salida JSON.**
    - **Si el documento no contiene claramente categorías y subcategorías de temario en este formato, devuelve un array JSON vacío (ej. []).**

    Ejemplo de formato de entrada (ignora la "Descripción" si aparece):
    Categoría: ÁLGEBRA Y
    Sub-Categoría: ÁLGEBRA Y
    Descripción: ÁLGEBRA Y
    Categoría: FUNCIONES
    Sub-Categoría: FUNCIONES
    Descripción: FUNCIONES
    Categoría: Expresiones algebraicas
    Sub-Categoría: Expresiones algebraicas
    Descripción: Expresiones algebraicas
    Categoría: ӹProductos notables.
    Sub-Categoría: ӹProductos notables.
    Descripción: ӹProductos notables.

    Texto a procesar:
    ${extractedText}

    Por favor, asegúrate de que la salida sea *solo* el JSON, sin texto explicativo adicional.
    `,

    temario_m2: (extractedText) => `Dada la siguiente lista de datos extraídos de un documento PDF de temario de PAES M2, quiero que me devuelvas una lista de objetos JSON. Cada objeto debe representar una entrada del temario y contener **solamente** las propiedades 'categoria' y 'sub_categoria'.

    **Instrucciones clave:**
    - Agrupa los valores que lógicamente pertenecen a la misma entrada.
    - Si una entrada es muy corta o parece ser un fragmento de una entrada anterior o posterior, intenta combinarla apropiadamente.
    - Ignora cualquier información que parezca ser una "descripción" detallada o una viñeta.
    - **Ignora específicamente la línea o frase que dice: "Todos los conocimientos de la PAES de Competencia Matemática 1 podrán ser evaluados, además de:". Esta línea no es parte del contenido del temario.**
    - **No incluyas la propiedad 'descripcion' en la salida JSON.**
    - **Si el documento no contiene claramente categorías y subcategorías de temario en este formato, devuelve un array JSON vacío (ej. []).**

    Ejemplo de formato de entrada (ignora la "Descripción" y la frase de M1 si aparece):
    Categoría: EJE TEMÁTICO
    UNIDADES TEMÁTICAS
    DESCRIPCIÓN DE LAS UNIDADES TEMÁTICAS
    Todos los conocimientos de la PAES de Competencia Matemática 1
    podrán ser evaluados, además de:
    Categoría: NÚMEROS
    Sub-Categoría: Números complejos
    Descripción: ӹOperaciones y propiedades de los números complejos.
    Categoría: ÁLGEBRA Y FUNCIONES
    Sub-Categoría: Ecuaciones e inecuaciones
    Descripción: ӹEcuaciones de segundo grado.

    Texto a procesar:
    ${extractedText}

    Por favor, asegúrate de que la salida sea *solo* el JSON, sin texto explicativo adicional.
    `,
    // Aquí se añadirían más funciones de prompt en el futuro, por ejemplo:
    // cuestionario: (extractedText) => `Prompt para extraer preguntas y respuestas...`
};

/**
 * Procesa un PDF y extrae información según un tipo de extracción especificado.
 *
 * @param {object} req - Objeto de solicitud de Express (espera req.file y req.body.extractionType).
 * @param {object} res - Objeto de respuesta de Express.
 */
exports.processPdfForExtraction = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No se subió ningún archivo PDF.' });
    }

    const extractionType = req.body.extractionType;
    if (!extractionType || !EXTRACTION_PROMPTS[extractionType]) {
        return res.status(400).json({
            message: `Tipo de extracción no especificado o no soportado: ${extractionType}. Tipos soportados: ${Object.keys(EXTRACTION_PROMPTS).join(', ')}`
        });
    }

    const pdfPath = req.file.path;
    let rawExtractedText = '';

    try {
        // 1. Extraer texto plano del PDF (con pdf-parse)
        const dataBuffer = fs.readFileSync(pdfPath);
        const data = await pdf(dataBuffer);
        rawExtractedText = data.text;

        // 2. Enviar texto plano a la IA para el formato JSON
        const formattedData = await extractAndFormatWithAI(rawExtractedText, extractionType);

        // Si la IA no pudo extraer datos, el array estará vacío
        if (!formattedData || formattedData.length === 0) {
            return res.status(400).json({
                message: 'No se pudo extraer información relevante del PDF. Asegúrate de que el archivo sea un temario válido.'
            });
        }

        res.json({
            message: `PDF procesado y formateado con IA para '${extractionType}' exitosamente.`,
            data: formattedData
        });

    } catch (error) {
        console.error('Error procesando el PDF o formateando con IA:', error);
        // Distinguir entre errores de IA y errores de formato/contenido
        if (error.message.includes('No se pudo obtener el formato de datos') ||
            error.message.includes('No se pudo extraer información relevante')) {
            // Un error ya manejado de negocio (ej. IA no encontró datos)
            res.status(400).json({ message: error.message, error: error.name });
        } else {
            // Otros errores inesperados
            res.status(500).json({ message: 'Error interno del servidor al procesar el PDF.', error: error.message });
        }
    } finally {
        // Eliminar el archivo temporal del PDF
        fs.unlink(pdfPath, (err) => {
            if (err) console.error('Error al eliminar el archivo temporal:', err);
        });
    }
};

/**
 * Envía el texto extraído a un modelo de Google Gemini para formatear en JSON.
 * La IA recibe un prompt específico basado en el tipo de extracción.
 *
 * @param {string} text - El texto plano extraído del PDF.
 * @param {string} extractionType - El tipo de extracción a realizar (ej. 'temario_m1').
 * @returns {Array<Object>} Un array de objetos en el formato JSON deseado (sin descripción).
 * @throws {Error} Si el modelo no devuelve un JSON válido o un array vacío.
 */
async function extractAndFormatWithAI(text, extractionType) {
    const getPrompt = EXTRACTION_PROMPTS[extractionType];
    const prompt = getPrompt(text); // Genera el prompt específico para el tipo

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let jsonString = response.text().trim();

        // Limpiar el JSON de posibles cercas de Markdown (```json ... ```)
        if (jsonString.startsWith('```json')) {
            jsonString = jsonString.substring(7, jsonString.lastIndexOf('```')).trim();
        } else if (jsonString.startsWith('```')) {
            jsonString = jsonString.substring(3, jsonString.lastIndexOf('```')).trim();
        }

        let parsedJson;
        try {
            parsedJson = JSON.parse(jsonString);
        } catch (jsonError) {
            console.error('Error al parsear el JSON de la IA:', jsonError);
            throw new Error('La IA devolvió un formato JSON inválido. ' + jsonError.message);
        }

        // Validación 1: Asegurarse de que el resultado sea un array
        if (!Array.isArray(parsedJson)) {
            throw new Error('La IA no devolvió un array JSON como se esperaba. Formato inesperado.');
        }

        // Limpiar el carácter 'ӹ' y otros caracteres especiales que puedan aparecer
        // Se aplica a todos los campos string en el JSON.
        const cleanedJson = parsedJson.map(item => {
            const newItem = {};
            for (const key in item) {
                if (typeof item[key] === 'string') {
                    // Limpiar el carácter 'ӹ' y cualquier otro carácter Unicode similar a viñeta
                    newItem[key] = item[key].replace(/[\u00D7\u2022\u2023\u25E6\u2043\u25A0-\u25AE\u25AA-\u25CC\u2610-\u2612\u2616-\u2617\u2666\s]+/g, ' ').trim();
                } else {
                    newItem[key] = item[key];
                }
            }
            return newItem;
        });

        // Asegurarse de que no haya una propiedad 'descripcion' si la IA la incluyó por error
        const finalCleanedJson = cleanedJson.map(item => {
            const { descripcion, ...rest } = item; // Desestructura para omitir 'descripcion'
            return rest;
        });

        // Validación 2: Verificar si se encontraron elementos con las propiedades esperadas
        const hasValidEntries = finalCleanedJson.some(item =>
            typeof item.categoria === 'string' && item.categoria.length > 0 &&
            typeof item.sub_categoria === 'string' && item.sub_categoria.length > 0
        );

        if (!hasValidEntries && finalCleanedJson.length > 0) {
            // Esto ocurre si la IA devuelve un array no vacío pero con objetos que no tienen las propiedades esperadas o están vacías
            throw new Error('La IA devolvió datos en el formato correcto pero sin contenido relevante (categorías/subcategorías).');
        }

        return finalCleanedJson;
    } catch (error) {
        console.error('Error en extractAndFormatWithAI:', error);
        // Relanzar el error para que sea capturado en processPdfForExtraction
        throw error;
    }
}