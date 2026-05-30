# Pelis Xuntos Server

Servidor backend para la aplicación Pelis Xuntos.

## Configuración

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Crear archivo `.env` en la raíz del directorio `server/` con las siguientes variables:
   ```
   PORT=4000
   DB_FILE_PATH=./data.sqlite
   OMDB_API_KEY=263d22d8  # API key gratuita de OMDB (ya configurada)
   WATCHMODE_API_KEY=tu_api_key_aqui  # Obtén una API key gratuita en https://api.watchmode.com/
   ```

   Para despliegue, apunta `DB_FILE_PATH` a una ruta persistente del servidor, por ejemplo:
   - `/var/lib/Pelis Xuntos/data.sqlite`
   - `/mnt/app-data/Pelis Xuntos.sqlite`

   Importante:
   - El proceso de Node debe tener permisos de lectura/escritura en esa ruta.
   - Evita guardar la base de datos dentro del directorio temporal del contenedor.
   - Haz copia de seguridad periódica del archivo SQLite.

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
- `GET /api/lists/public?q=texto` - Buscar listas públicas
- `POST /api/lists/:listId/subscribe` - Suscribirse a una lista pública
- `PATCH /api/lists/:listId/settings` - Configurar visibilidad y vetos de una lista propia
- Y más...

## Base de datos

Usa SQLite. El archivo se define por:

- `DB_FILE_PATH` (recomendado para despliegue)
- o `server/data.sqlite` por defecto en desarrollo

Las tablas se crean automáticamente al iniciar y se aplican migraciones ligeras para columnas nuevas de listas (`is_public`, `allow_veto`, `description`).