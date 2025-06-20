/**
 * Configuración de la experiencia (EXP) y los rangos del juego.
 * Centraliza valores para facilitar su mantenimiento.
 */
const EXP_CONFIG = {
  // Experiencia base ganada por pregunta según su dificultad
  difficulty_exp_gain: {
    'Baja': 20,
    'Media': 25,
    'Alta': 30,
    'Muy Alta': 40,
  },

  // EXP total acumulada necesaria para alcanzar cada rango
  rank_exp_requirements: [
    { name: 'Bronce', required_exp: 0 },
    { name: 'Plata', required_exp: 6000 },
    { name: 'Oro', required_exp: 12000 },
  ],
};

module.exports = EXP_CONFIG;
