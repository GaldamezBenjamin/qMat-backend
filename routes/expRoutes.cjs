const express = require('express');
const router = express.Router();
const EXP_CONFIG = require('../constants/expConfig');

// GET /api/exp/dificultad
router.get('/dificultad', (req, res) => {
  res.json(EXP_CONFIG.difficulty_exp_gain);
});

// GET /api/exp/rangos
router.get('/rangos', (req, res) => {
  res.json(EXP_CONFIG.rank_exp_requirements);
});

// GET /api/exp (todo el config si lo necesitas completo)
router.get('/', (req, res) => {
  res.json(EXP_CONFIG);
});

module.exports = router;
