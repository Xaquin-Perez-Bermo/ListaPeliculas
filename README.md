# CineJunta

Aplicacion fullstack en React + Express para crear una lista conjunta de peliculas.

## Funcionalidades

- Registro/login de usuarios (JWT, basico).
- Lista compartida de peliculas para todo el grupo.
- Busqueda de peliculas en API externa (iTunes Search API).
- Veto por pelicula.
- Veto por genero.
- Seleccion aleatoria entre peliculas no vetadas.
- Puntuaciones tipo Letterboxd (0.5 a 5) con fecha de visionado.
- Filtros de lista por estado (todas/elegibles/vetadas) y por genero.
- Log basico de actividad.

## Stack

- Frontend: React + Vite.
- Backend: Node.js + Express.
- Base de datos: SQLite (better-sqlite3).

## Requisitos

- Node 20 o superior.

## Ejecutar en desarrollo (watch mode)

Desde la raiz del proyecto:

```bash
npm install
npm run dev
```

Esto levanta:

- Frontend en http://localhost:5173
- API en http://localhost:4000

## Variables opcionales

Puedes definir en entorno:

- `PORT` (por defecto 4000)
- `JWT_SECRET` (por defecto `dev-secret-change-me`)

## Endpoints principales

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/discover?q=termino`
- `GET /api/movies?status=all|active|vetoed&genre=texto`
- `POST /api/movies`
- `POST /api/movies/:id/veto`
- `DELETE /api/movies/:id/veto`
- `GET /api/veto-genres`
- `POST /api/veto-genres`
- `DELETE /api/veto-genres/:genre`
- `POST /api/movies/:id/rating`
- `GET /api/movies/:id/ratings`
- `GET /api/random-pick`
- `GET /api/logs`

## Notas

- El sistema es colaborativo global (sin salas/grupos).
- Si quieres separar por grupos, la extension natural es anadir una entidad `groups` y relacionar todas las operaciones por `group_id`.
