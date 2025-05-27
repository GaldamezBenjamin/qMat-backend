const usuarioSchema = {
  username: String,
  email: String,
  password: String,
  fecha_registro: Number,
  exp: {
    actual: Number,
    anterior: Number
  },
  suscripcion: {
    suscrito: Boolean,
    fecha_inicio: Number,
    fecha_fin: Number
  },
  rol: String
};

const intentoQuizSchema = {
  id_quiz: String,
  fecha_inicio: Number,
  fecha_fin: Number,
  respuestas_usuario: [
    {
      id_pregunta: String,
      respuesta_usuario: String,
      es_correcta: Boolean
    }
  ]
};

module.exports = { usuarioSchema, intentoQuizSchema };