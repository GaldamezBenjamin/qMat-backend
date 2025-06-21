const express = require('express');
const multer = require('multer');
const pdfController = require('../controllers/pdfCtrl.cjs');

const router = express.Router();

const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF.'), false);
    }
  }
});

router.post('/upload-pdf', upload.single('pdfFile'), pdfController.processPdfForExtraction);

module.exports = router;