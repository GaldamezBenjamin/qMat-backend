const preguntaSchema = {
  enunciado: String,
  dificultad: String,
  opciones: {
    a: String,
    b: String,
    c: String,
    d: String,
    correcta: String
  },
  id_categoria: String
};

module.exports = { preguntaSchema };