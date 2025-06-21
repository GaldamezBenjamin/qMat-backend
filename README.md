# qMática - Backend

Este repositorio contiene el backend para el proyecto de qMática.

## ¿Cómo ejecutar el proyecto?

1. **Clona el repositorio:**
   ```bash
   git clone https://github.com/tuusuario/qMatica-backend.git
   cd qMatica-backend
   ```

2. **Instala las dependencias:**
   ```bash
   npm install
   ```

3. **Configura las variables de entorno:**
   - Crea un archivo `.env` en la raíz del proyecto.
   - Agrega tus claves necesarias, por ejemplo:
     ```
     GEMINI_API_KEY=tu_clave_gemini
     FIREBASE_PROJECT_ID=tu_project_id
     FIREBASE_CLIENT_EMAIL=tu_email@proyecto.iam.gserviceaccount.com
     FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\ntu_clave\n-----END PRIVATE KEY-----\n"
     ```
   - Asegúrate de tener el archivo de configuración de Firebase (`serviceAccountKey.json` o similar) si tu proyecto lo requiere.

4. **Ejecuta el servidor en modo desarrollo:**
   ```bash
   npm run dev
   ```
   o en modo producción:
   ```bash
   npm start
   ```

5. **El backend estará disponible en:**  
   ```
   http://localhost:3000
   ```
   (o el puerto que definas en tu configuración)

---

## Sobre qMática

qMática, un proyecto conformado por tres alumnos de la carrera Analista Programador Computacional en DuocUC, de la sede Padre Alonso de Ovalle. El proyecto tiene como objetivo mejorar la retención de conocimientos en matemáticas al momento de prepararse para la Prueba de Acceso a la Educación Superior (PAES) M1 y M2 a través del «Active Recall», ofreciendo un mejor rendimiento en las pruebas.

La plataforma combina la inteligencia artificial con un sistema de quizzes, el cual se adaptará dependiendo de los contenidos que entrarán en las pruebas, gamificación con rangos y un sistema de estadísticas detalladas para poder reforzar las áreas menos fuertes del usuario. De esta forma, se busca motivar a los usuarios y así fortalecer sus conocimientos mediante prácticas interactivas.

*“qMática, Web para ejercitar para la PAES M1 y M2 con Quizzes Inteligentes”*

### Autores

- Benjamín Galdámez
- Vanessa Matta
- Joaquín Rodríguez
