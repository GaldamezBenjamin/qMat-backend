const { db } = require('../config/firebase.cjs');
const { createCategorySchema, updateCategorySchema } = require('../schemas/categoriaSchemas.cjs');
const { z } = require('zod'); // Import z for ZodError handling

// Get all categories
exports.getAllCategories = async (req, res) => {
    try {
        const categoriesRef = db.collection('categorias');
        const snapshot = await categoriesRef.get();

        if (snapshot.empty) {
            return res.status(404).json({ message: 'No se encontraron categorías.' });
        }

        const categories = [];
        snapshot.forEach(doc => {
            categories.push({
                id_categoria: doc.id,
                ...doc.data()
            });
        });
        res.status(200).json(categories);
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Get category by ID
exports.getCategoryById = async (req, res) => {
    try {
        const { id_categoria } = req.params;
        const categoryRef = db.collection('categorias').doc(id_categoria);
        const doc = await categoryRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: `Categoría con ID ${id_categoria} no encontrada.` });
        }

        res.status(200).json({ id_categoria: doc.id, ...doc.data() });
    } catch (error) {
        console.error(`Error al obtener categoría con ID ${req.params.id_categoria}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Create a new category
// Only accessible by admin users
exports.createCategory = async (req, res) => {
    try {
        const { nombre, paes } = req.body;

        // Validate request body with Zod
        const validatedData = createCategorySchema.parse({ nombre, paes });

        // Check if category name already exists (optional, but good for uniqueness)
        const existingCategory = await db.collection('categorias').where('nombre', '==', validatedData.nombre).limit(1).get();
        if (!existingCategory.empty) {
            return res.status(409).json({ message: `La categoría con nombre "${validatedData.nombre}" ya existe.` });
        }

        const newCategoryRef = db.collection('categorias').doc(); // Auto-generate ID
        await newCategoryRef.set(validatedData);

        res.status(201).json({ message: 'Categoría creada exitosamente.', id_categoria: newCategoryRef.id, category: validatedData });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Datos de entrada inválidos.', errors: error.errors });
        }
        console.error('Error al crear categoría:', error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Update an existing category
// Only accessible by admin users
exports.updateCategory = async (req, res) => {
    try {
        const { id_categoria } = req.params;
        const updates = req.body;

        // Validate request body with Zod
        const validatedUpdates = updateCategorySchema.parse(updates);

        const categoryRef = db.collection('categorias').doc(id_categoria);
        const doc = await categoryRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: `Categoría con ID ${id_categoria} no encontrada.` });
        }

        // If trying to update name, check for uniqueness unless it's the same name
        if (validatedUpdates.nombre && validatedUpdates.nombre !== doc.data().nombre) {
            const existingCategory = await db.collection('categorias').where('nombre', '==', validatedUpdates.nombre).limit(1).get();
            if (!existingCategory.empty) {
                return res.status(409).json({ message: `La categoría con nombre "${validatedUpdates.nombre}" ya existe.` });
            }
        }

        await categoryRef.update(validatedUpdates);
        res.status(200).json({ message: 'Categoría actualizada exitosamente.' });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Datos de entrada inválidos.', errors: error.errors });
        }
        console.error(`Error al actualizar categoría con ID ${req.params.id_categoria}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};

// Delete a category
// Only accessible by admin users
exports.deleteCategory = async (req, res) => {
    try {
        const { id_categoria } = req.params;
        const categoryRef = db.collection('categorias').doc(id_categoria);
        const doc = await categoryRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: `Categoría con ID ${id_categoria} no encontrada.` });
        }

        await categoryRef.delete();
        res.status(200).json({ message: 'Categoría eliminada exitosamente.' });
    } catch (error) {
        console.error(`Error al eliminar categoría con ID ${req.params.id_categoria}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
};