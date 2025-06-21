// temarioCtrl.cjs
const { db } = require('../config/firebase.cjs'); // Asegúrate de que esta ruta sea correcta
const admin = require("firebase-admin"); // Si necesitas más funcionalidades de admin

// Función para manejar la subida masiva de categorías y subcategorías
exports.bulkUploadCaregorias = async (req, res) => {
  const dataToProcess = req.body; // Esto será un array de objetos como:
  // { nombre: "Estadística", paes: "M1", subcategorias: [...] }

  if (
    !dataToProcess ||
    !Array.isArray(dataToProcess) ||
    dataToProcess.length === 0
  ) {
    return res
      .status(400)
      .json({ message: "No se recibieron datos válidos para el temario." });
  }

  const overallResults = [];
  const categoryCache = new Map(); // Para guardar IDs de categorías ya procesadas

  // Usaremos un Batch para hacer escrituras atómicas si es posible y más eficiente
  // Aunque para crear categorías y luego subcategorías, a menudo se necesitan operaciones secuenciales
  // let batch = db.batch(); // Puedes usar esto para las subcategorías dentro de una categoría si ya tienes el ID

  try {
    for (const categoryGroup of dataToProcess) {
      const { nombre: categoryName, paes, subcategorias } = categoryGroup;
      const categoryResult = {
        categoryName: categoryName,
        paes: paes,
        status: "pending",
        categoryId: null,
        subcategoriesResults: [],
      };

      // 1. Procesar Categoría Principal
      let currentCategoryId = null;
      const normalizedCategoryName = categoryName.trim();

      if (categoryCache.has(normalizedCategoryName)) {
        currentCategoryId = categoryCache.get(normalizedCategoryName);
        categoryResult.status = "reused_category";
        categoryResult.categoryId = currentCategoryId;
      } else {
        // Buscar si la categoría ya existe por nombre
        const categoryQuery = await db
          .collection("categorias")
          .where("nombre", "==", normalizedCategoryName)
          .limit(1)
          .get();

        if (!categoryQuery.empty) {
          // Categoría existente, obtener su ID
          currentCategoryId = categoryQuery.docs[0].id;
          categoryCache.set(normalizedCategoryName, currentCategoryId);
          categoryResult.status = "found_existing_category";
          categoryResult.categoryId = currentCategoryId;
        } else {
          // Categoría no existe, crearla
          try {
            const newCategoryData = {
              nombre: normalizedCategoryName,
              paes: paes, // Usar el PAES enviado desde el frontend
            };
            const newCategoryRef = await db
              .collection("categorias")
              .add(newCategoryData);
            currentCategoryId = newCategoryRef.id;
            categoryCache.set(normalizedCategoryName, currentCategoryId);
            categoryResult.status = "created_category";
            categoryResult.categoryId = currentCategoryId;
          } catch (catError) {
            console.error(
              `Error al crear categoría '${normalizedCategoryName}':`,
              catError
            );
            categoryResult.status = "failed_category_creation";
            categoryResult.error = catError.message;
            overallResults.push(categoryResult); // Registrar fallo de la categoría
            continue; // Saltar a la siguiente categoría si la creación de la principal falló
          }
        }
      }

      // Si la categoría fue creada o encontrada, procesar sus subcategorías
      if (currentCategoryId && subcategorias && Array.isArray(subcategorias)) {
        // Crear un batch para las subcategorías de esta categoría, si lo prefieres
        // Esto es útil si tienes muchas subcategorías y quieres que se suban en una sola operación atómica (dentro de lo posible en Firestore)
        const subcategoriesBatch = db.batch();
        let subcatBatchCount = 0;

        for (const subItem of subcategorias) {
          const normalizedSubCategoryName = subItem.nombre.trim();
          const subCategoryResult = {
            subCategoryName: normalizedSubCategoryName,
            status: "pending",
          };

          // Opcional: Verificar duplicados de subcategorías para esta categoría
          // Solo si quieres evitar que se creen subcategorías con el mismo nombre y id_categoria
          const existingSubcatQuery = await db
            .collection("sub_categorias")
            .where("id_categoria", "==", currentCategoryId)
            .where("nombre", "==", normalizedSubCategoryName)
            .limit(1)
            .get();

          if (!existingSubcatQuery.empty) {
            subCategoryResult.status = "skipped_existing_subcategory";
            subCategoryResult.subCategoryId = existingSubcatQuery.docs[0].id;
          } else {
            // Subcategoría no existe, añadirla al batch
            try {
              const newSubCategoryData = {
                nombre: normalizedSubCategoryName,
                id_categoria: currentCategoryId,
                // Puedes añadir 'descripcion' aquí si la envías desde el front
                // descripcion: subItem.descripcion || ''
              };
              const newSubCategoryRef = db.collection("sub_categorias").doc(); // Generar un ID de documento
              subcategoriesBatch.set(newSubCategoryRef, newSubCategoryData);
              subcatBatchCount++;
              subCategoryResult.status = "added_to_batch";
              subCategoryResult.potentialSubCategoryId = newSubCategoryRef.id; // ID temporal
            } catch (subcatError) {
              console.error(
                `Error preparando subcategoría '${normalizedSubCategoryName}':`,
                subcatError
              );
              subCategoryResult.status = "failed_preparation";
              subCategoryResult.error = subcatError.message;
            }
          }
          categoryResult.subcategoriesResults.push(subCategoryResult);
        }

        // Ejecutar el batch de subcategorías si hay algo que añadir
        if (subcatBatchCount > 0) {
          try {
            await subcategoriesBatch.commit();
            // Actualizar el estado de las subcategorías en los resultados del batch
            categoryResult.subcategoriesResults.forEach((subRes) => {
              if (subRes.status === "added_to_batch") {
                subRes.status = "created_subcategory";
                // El actual ID final solo se conoce después del commit, pero Firestore asigna IDs
                // al '.doc()' si no se provee. Ya tenemos el 'potentialSubCategoryId'.
              }
            });
          } catch (batchError) {
            console.error(
              `Error committeando batch de subcategorías para '${normalizedCategoryName}':`,
              batchError
            );
            categoryResult.subcategoriesResults.forEach((subRes) => {
              if (subRes.status === "added_to_batch") {
                subRes.status = "failed_batch_commit";
                subRes.error = batchError.message;
              }
            });
          }
        }
      }
      overallResults.push(categoryResult);
    }

    res.status(200).json({
      message: "Proceso de subida masiva de temario completado.",
      results: overallResults,
    });
  } catch (error) {
    console.error("Error general durante la subida masiva de temario:", error);
    res
      .status(500)
      .json({
        message:
          "Error interno del servidor durante la subida masiva del temario.",
        error: error.message,
      });
  }
};

/**
 * Método para la subida masiva de quizzes y sus preguntas asociadas.
 * El formato de entrada es un array de objetos, donde cada objeto contiene
 * un quiz y un conjunto de preguntas para ese quiz.
 * Las preguntas se suben primero para obtener sus IDs, luego el quiz
 * se sube con un array de esos IDs.
 *
 * @param {object} req - Objeto de solicitud de Express.
 * Espera body: [
 * {
 * "quiz": { ... },
 * "preguntas": { "pregunta_1": { ... }, ... }
 * },
 * // ... más objetos de quiz/preguntas
 * ]
 * @param {object} res - Objeto de respuesta de Express.
 */
exports.uploadQuizzesAndQuestions = async (req, res) => {
  const dataToProcess = req.body;

  if (!dataToProcess || !Array.isArray(dataToProcess) || dataToProcess.length === 0) {
    return res.status(400).json({ message: "No se recibieron datos válidos para la subida de quizzes y preguntas." });
  }

  const overallResults = []; // Almacenará los resultados de cada conjunto quiz-preguntas

  console.log(`Iniciando la subida masiva para ${dataToProcess.length} conjuntos de quizzes y preguntas.`);

  for (const quizSet of dataToProcess) {
    const quizResult = {
      quizName: quizSet.quiz?.nombre || 'Nombre desconocido',
      quizStatus: 'pending',
      quizId: null,
      questionUploads: [], // Para almacenar el estado de cada pregunta
      error: null
    };

    let uploadedQuestionIds = [];
    let questionsUploadSuccess = true; // Para saber si todas las preguntas de este quiz se subieron bien

    try {
      // --- 1. Subir Preguntas ---
      if (quizSet.preguntas && typeof quizSet.preguntas === 'object') {
        const questionKeys = Object.keys(quizSet.preguntas);
        console.log(`  > Procesando ${questionKeys.length} preguntas para el quiz: "${quizResult.quizName}"`);

        for (const key of questionKeys) {
          const questionData = quizSet.preguntas[key];
          const questionUploadResult = {
            key: key, // La clave original (ej. "pregunta_1")
            status: 'pending',
            questionId: null,
            error: null
          };

          // Validar campos esenciales de la pregunta
          if (!questionData.enunciado || !questionData.opciones || !questionData.id_subcategoria) {
            questionUploadResult.status = 'failed_validation';
            questionUploadResult.error = 'Campos esenciales de la pregunta faltantes.';
            questionsUploadSuccess = false;
            console.error(`    - Error de validación para pregunta "${key}" del quiz "${quizResult.quizName}".`);
            quizResult.questionUploads.push(questionUploadResult);
            continue; // Saltar a la siguiente pregunta
          }

          try {
            // Subir la pregunta a la colección 'preguntas'
            const newQuestionRef = await db.collection('preguntas').add(questionData);
            uploadedQuestionIds.push(newQuestionRef.id);
            questionUploadResult.status = 'success';
            questionUploadResult.questionId = newQuestionRef.id;
            console.log(`    - Pregunta "${key}" para "${quizResult.quizName}" subida con ID: ${newQuestionRef.id}`);
          } catch (questionError) {
            questionUploadResult.status = 'failed_upload';
            questionUploadResult.error = questionError.message;
            questionsUploadSuccess = false;
            console.error(`    - Error al subir pregunta "${key}" para "${quizResult.quizName}":`, questionError);
          } finally {
            quizResult.questionUploads.push(questionUploadResult);
          }
        }
      } else {
        quizResult.quizStatus = 'failed_no_questions';
        quizResult.error = 'No se encontraron preguntas válidas en el formato esperado.';
        questionsUploadSuccess = false;
      }

      // Si las preguntas no se subieron correctamente, no intentamos subir el quiz.
      if (!questionsUploadSuccess) {
        quizResult.quizStatus = 'failed_due_to_questions_errors';
        quizResult.error = 'No todas las preguntas pudieron ser subidas, quiz no creado.';
        overallResults.push(quizResult);
        continue; // Pasar al siguiente conjunto de quiz/preguntas
      }

      // --- 2. Subir Quiz con IDs de Preguntas ---
      if (quizSet.quiz) {
        const quizData = {
          ...quizSet.quiz,
          id_preguntas: uploadedQuestionIds, // Asociar las preguntas subidas
          // Aquí puedes añadir otros campos como fecha de creación, etc.
          // createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Validar campos esenciales del quiz
        if (!quizData.nombre || !quizData.main_subcategory?.id) {
          quizResult.quizStatus = 'failed_validation';
          quizResult.error = 'Campos esenciales del quiz (nombre o id de subcategoría principal) faltantes.';
          console.error(`  > Error de validación para el quiz "${quizResult.quizName}".`);
          overallResults.push(quizResult);
          continue;
        }

        try {
          // Subir el quiz a la colección 'quizzes'
          const newQuizRef = await db.collection('quizzes').add(quizData);
          quizResult.quizId = newQuizRef.id;
          quizResult.quizStatus = 'success';
          console.log(`  > Quiz "${quizResult.quizName}" subido con éxito, ID: ${newQuizRef.id}`);
        } catch (quizError) {
          quizResult.quizStatus = 'failed_upload';
          quizResult.error = quizError.message;
          console.error(`  > Error al subir quiz "${quizResult.quizName}":`, quizError);
        }
      } else {
        quizResult.quizStatus = 'failed_no_quiz_data';
        quizResult.error = 'No se encontraron datos del quiz en el formato esperado.';
        console.error(`  > Error: No hay datos de quiz para el conjunto actual.`);
      }

    } catch (generalError) {
      quizResult.quizStatus = 'failed_general_process';
      quizResult.error = generalError.message;
      console.error(`Error general procesando el conjunto de quiz "${quizResult.quizName}":`, generalError);
    } finally {
      overallResults.push(quizResult); // Asegurarse de que el resultado de este quizSet se añada
    }
  }

  // --- Respuesta Final ---
  const allSuccess = overallResults.every(r => r.quizStatus === 'success');
  const statusCode = allSuccess ? 200 : 207; // 207 Multi-Status si algunos fallaron, otros no

  res.status(statusCode).json({
    message: allSuccess ? 'Todos los quizzes y preguntas fueron subidos exitosamente.' : 'El proceso de subida masiva completó con algunos errores.',
    results: overallResults
  });
};