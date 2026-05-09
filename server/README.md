# CineJunta Server

Servidor backend para la aplicación CineJunta.

## Configuración

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Crear archivo `.env` en la raíz del directorio `server/` con las siguientes variables:
   ```
   PORT=4000
   OMDB_API_KEY=263d22d8  # API key gratuita de OMDB (ya configurada)
   WATCHMODE_API_KEY=tu_api_key_aqui  # Obtén una API key gratuita en https://api.watchmode.com/
   ```

3. Para obtener una API key de Watchmode:
   - Ve a https://api.watchmode.com/
   - Regístrate para una cuenta gratuita
   - Obtén tu API key del dashboard
   - Agrega `WATCHMODE_API_KEY=tu_api_key` al archivo `.env`

4. Iniciar el servidor:
   ```bash
   npm start
   ```

## Endpoints

- `GET /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Obtener usuario actual
- `GET /api/discover?q=query` - Buscar películas externas
- `GET /api/movies` - Obtener lista de películas compartidas
- `POST /api/movies` - Agregar película a la lista compartida
- `GET /api/watchmode?title=titulo&year=año` - Obtener info de streaming de Watchmode
- Y más...

## Base de datos

Usa SQLite con archivo `data.sqlite`. Se crea automáticamente al iniciar.