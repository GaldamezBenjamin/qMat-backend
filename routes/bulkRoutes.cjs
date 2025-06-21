const express = require('express');
const router = express.Router();
const bulk = require('../controllers/bulkCtrl.cjs');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware.cjs');

router.use(verifyToken);

router.post('/upload-categorias', authorizeRoles('admin'), bulk.bulkUploadCaregorias);

router.post('/upload-quizzes', authorizeRoles('admin'), bulk.uploadQuizzesAndQuestions);

module.exports = router;