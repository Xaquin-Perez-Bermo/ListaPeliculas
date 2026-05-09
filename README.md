# CineJunta

Aplicacion fullstack para descubrir peliculas, guardarlas por listas, gestionar vetos y valorar visionados.

## 1. Vision general

Arquitectura:
- Cliente React + Vite
- API Express
- SQLite (persistencia local)

Objetivo del proyecto:
- Compartir una lista conjunta de peliculas
- Mantener listas locales personalizadas
- Buscar en catalogo externo
- Guardar/quitar peliculas de listas con UX tipo "guardado"
- Internacionalizacion base (es/en)

## 2. Requisitos

- Node.js 20+
- npm 10+

## 3. Arranque rapido

Desde la raiz del repositorio:

```bash
npm install
npm run dev
```

Servicios esperados:
- Frontend: http://localhost:5173
- Backend: http://localhost:4000

## 4. Scripts utiles

Raiz:
- npm run dev: arranca cliente y servidor en desarrollo

Cliente (carpeta client):
- npm run dev: Vite dev server
- npm run build: build de produccion
- npm run lint: analisis estatico
- npm run preview: preview de build

Servidor (carpeta server):
- npm run dev o equivalente del proyecto para modo desarrollo

## 5. Variables de entorno

Backend:
- PORT: puerto API (default 4000)
- JWT_SECRET: secreto JWT (default desarrollo)

Recomendacion:
- Definir JWT_SECRET fuerte fuera de desarrollo.

## 6. Estructura recomendada

Raiz:
- client: frontend React
- server: backend Express + SQLite

Cliente (resumen):
- src/hooks: hooks de dominio (auth, movies, search, local lists)
- src/screens: pantallas y modales/paneles
- src/services: acceso API y localStorage
- src/utils: utilidades puras
- src/i18n: provider + diccionarios

## 7. Funcionalidades implementadas

- Auth JWT (registro/login/perfil)
- Lista compartida global
- Busqueda externa
- Veto por pelicula y por genero
- Random pick de peliculas elegibles
- Valoraciones con fecha
- Listas locales dinamicas
- Lista "favoritas" permanente (no eliminable)
- Guardado con estado "Guardada" y toggle por lista
- Selector de idioma (es/en) con provider i18n

## 8. UX de guardado (tipo Spotify)

Comportamiento:
- Si una pelicula ya esta en alguna lista local, el CTA cambia a "Guardada".
- Al abrir selector, puedes:
	- Anadir a una lista
	- Quitar de una lista donde ya estaba guardada
	- Crear una lista nueva
	- Borrar listas (excepto favoritas)
- La misma pelicula puede estar en varias listas.

## 9. Internacionalizacion (i18n)

Implementacion:
- Provider: client/src/i18n/I18nProvider.jsx
- Diccionario: client/src/i18n/translations.js
- Uso: hook useI18n() -> t(key, vars)

Ejemplo:

```jsx
const { t } = useI18n()
return <h2>{t('searchTitle')}</h2>
```

Interpolacion:

```js
t('helloUser', { username: 'Ana' })
```

## 10. API principal (resumen)

Auth:
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

Busqueda/listas:
- GET /api/discover?q=term
- GET /api/movies?status=all|active|vetoed&genre=text
- POST /api/movies

Vetos:
- POST /api/movies/:id/veto
- DELETE /api/movies/:id/veto
- GET /api/veto-genres
- POST /api/veto-genres
- DELETE /api/veto-genres/:genre

Ratings y actividad:
- POST /api/movies/:id/rating
- GET /api/movies/:id/ratings
- GET /api/random-pick
- GET /api/logs

## 11. Guía de desarrollo

Flujo recomendado:
1. Crear rama de feature.
2. Implementar cambios pequeños y verificables.
3. Ejecutar lint/build local.
4. Probar casos principales:
	 - Busqueda
	 - Guardado/quitar por listas
	 - Crear/borrar listas
	 - Cambio de idioma
5. Abrir PR con checklist de pruebas.

Checklist minima manual:
- Login/register ok
- Añadir pelicula a lista compartida ok
- Toggle local list add/remove ok
- "Guardada" visible cuando corresponde
- Favoritas no se puede borrar
- Traducciones es/en aplican en UI principal

## 12. Tutorial rapido React para este proyecto

### Nivel 1: Fundamentos

Objetivo: leer y modificar UI sin romper estado.

Conceptos clave:
- Componentes funcionales
- Props
- useState
- render condicional
- listas con map

Practica sugerida:
- Cambia un label de SearchScreen a traves de i18n.

### Nivel 2: Estado y efectos

Objetivo: entender el flujo de datos.

Conceptos clave:
- useEffect
- useMemo
- useCallback
- custom hooks

Practica sugerida:
- Revisar useSearch y useLocalLists para entender fuentes de verdad.

### Nivel 3: Arquitectura frontend

Objetivo: escalar features.

Conceptos clave:
- Separar dominio (hooks), UI (screens), infraestructura (services)
- Evitar componentes gigantes
- Reutilizar componentes de interaccion (ListSelector)

Practica sugerida:
- Extraer un subcomponente de una pantalla y mantener el comportamiento.

### Nivel 4: Calidad y UX

Objetivo: entregar features robustas.

Conceptos clave:
- Accesibilidad basica (roles, botones nativos)
- Estados de carga/error
- Feedback al usuario
- Contraste visual y consistencia

Practica sugerida:
- Agregar un estado de loading a una accion async y feedback traducido.

## 13. Recursos recomendados para aprender React

Ruta oficial:
- React docs: https://react.dev/learn

Temas concretos:
- Thinking in React: https://react.dev/learn/thinking-in-react
- State as a Snapshot: https://react.dev/learn/state-as-a-snapshot
- Sharing State: https://react.dev/learn/sharing-state-between-components
- Escape Hatches: https://react.dev/learn/escape-hatches

Buenas practicas adicionales:
- Vite: https://vite.dev/guide/
- ESLint: https://eslint.org/docs/latest/

## 14. Troubleshooting rapido

Error 500 en Vite por JSX:
- Revisar cierres de etiquetas y fragmentos.
- Mirar el archivo y linea exacta del overlay de Vite.

Errores de extensiones del navegador:
- Mensajes tipo keepass/passkeys no suelen ser de la app.
- Probar en ventana incognito sin extensiones para confirmar.

## 15. Proximos pasos sugeridos

- Tests unitarios para hooks de listas (toggle/add/remove/create/delete).
- Persistir idioma en localStorage.
- Añadir fallback de traducciones por namespace.
- Añadir tests E2E de flujo Guardada con Playwright.
