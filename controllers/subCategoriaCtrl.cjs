const { db } = require('../config/firebase.cjs');
const { createSubCategorySchema, updateSubCategorySchema } = require('../schemas/subCategoriaSchemas.cjs');
const { z } = require('zod'); // Import z for ZodError handling

// Get all subcategories
exports.getAllSubCategories = async (req, res) => {
    try {
        const subCategoriesRef = db.collection('sub_categorias');
        const snapshot = await subCategoriesRef.get();

        if (snapshot.empty) {
            return res.status(404).json({ message: 'No se encontraron subcategorías.' });
        }

        const subCategories = [];
        snapshot.forEach(doc => {
            subCategories.push({
                id_subcategoria: doc.id,
                ...doc.data()
            });
        });
        res.status(200).json(subCategories);
    } catch (error) {
        console.error('Error al obtener subcategorías:', error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Get subcategory by ID
exports.getSubCategoryById = async (req, res) => {
    try {
        const { id_subcategoria } = req.params;
        const subCategoryRef = db.collection('sub_categorias').doc(id_subcategoria);
        const doc = await subCategoryRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: `Subcategoría con ID ${id_subcategoria} no encontrada.` });
        }

        res.status(200).json({ id_subcategoria: doc.id, ...doc.data() });
    } catch (error) {
        console.error(`Error al obtener subcategoría con ID ${req.params.id_subcategoria}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Create a new subcategory
// Only accessible by admin users
exports.createSubCategory = async (req, res) => {
    try {
        const { nombre, id_categoria } = req.body;

        // Validate request body with Zod
        const validatedData = createSubCategorySchema.parse({ nombre, id_categoria });

        // Verify if id_categoria exists in the 'categorias' collection
        const categoryRef = db.collection('categorias').doc(validatedData.id_categoria);
        const categoryDoc = await categoryRef.get();

        if (!categoryDoc.exists) {
            return res.status(400).json({ message: `La categoría con ID ${validatedData.id_categoria} no existe.` });
        }

        // Check if subcategory name already exists under this category (optional, for uniqueness)
        const existingSubCategory = await db.collection('sub_categorias')
                                            .where('nombre', '==', validatedData.nombre)
                                            .where('id_categoria', '==', validatedData.id_categoria)
                                            .limit(1)
                                            .get();

        if (!existingSubCategory.empty) {
            return res.status(409).json({ message: `La subcategoría "${validatedData.nombre}" ya existe para la categoría ${validatedData.id_categoria}.` });
        }

        const newSubCategoryRef = db.collection('sub_categorias').doc(); // Auto-generate ID
        await newSubCategoryRef.set(validatedData);

        res.status(201).json({ message: 'Subcategoría creada exitosamente.', id_subcategoria: newSubCategoryRef.id, subCategory: validatedData });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Datos de entrada inválidos.', errors: error.errors });
        }
        console.error('Error al crear subcategoría:', error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Update an existing subcategory
// Only accessible by admin users
exports.updateSubCategory = async (req, res) => {
    try {
        const { id_subcategoria } = req.params;
        const updates = req.body;

        // Validate request body with Zod
        const validatedUpdates = updateSubCategorySchema.parse(updates);

        const subCategoryRef = db.collection('sub_categorias').doc(id_subcategoria);
        const doc = await subCategoryRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: `Subcategoría con ID ${id_subcategoria} no encontrada.` });
        }

        // If id_categoria is being updated, verify its existence
        if (validatedUpdates.id_categoria && validatedUpdates.id_categoria !== doc.data().id_categoria) {
            const categoryRef = db.collection('categorias').doc(validatedUpdates.id_categoria);
            const categoryDoc = await categoryRef.get();
            if (!categoryDoc.exists) {
                return res.status(400).json({ message: `La nueva categoría con ID ${validatedUpdates.id_categoria} no existe.` });
            }
        }

        // If trying to update name and/or category, check for uniqueness under the new category
        if (validatedUpdates.nombre && validatedUpdates.nombre !== doc.data().nombre || validatedUpdates.id_categoria && validatedUpdates.id_categoria !== doc.data().id_categoria) {
            const targetCategory = validatedUpdates.id_categoria || doc.data().id_categoria;
            const targetName = validatedUpdates.nombre || doc.data().nombre;

            const existingSubCategory = await db.collection('sub_categorias')
                                                .where('nombre', '==', targetName)
                                                .where('id_categoria', '==', targetCategory)
                                                .limit(1)
                                                .get();
            if (!existingSubCategory.empty && existingSubCategory.docs[0].id !== id_subcategoria) {
                return res.status(409).json({ message: `La subcategoría "${targetName}" ya existe para la categoría ${targetCategory}.` });
            }
        }


        await subCategoryRef.update(validatedUpdates);
        res.status(200).json({ message: 'Subcategoría actualizada exitosamente.' });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Datos de entrada inválidos.', errors: error.errors });
        }
        console.error(`Error al actualizar subcategoría con ID ${req.params.id_subcategoria}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Delete a subcategory
// Only accessible by admin users
exports.deleteSubCategory = async (req, res) => {
    try {
        const { id_subcategoria } = req.params;
        const subCategoryRef = db.collection('sub_categorias').doc(id_subcategoria);
        const doc = await subCategoryRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: `Subcategoría con ID ${id_subcategoria} no encontrada.` });
        }

        await subCategoryRef.delete();
        res.status(200).json({ message: 'Subcategoría eliminada exitosamente.' });
    } catch (error) {
        console.error(`Error al eliminar subcategoría con ID ${req.params.id_subcategoria}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};