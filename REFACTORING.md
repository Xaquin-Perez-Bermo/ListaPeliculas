# Refactorización de App.jsx - Documentación

## 📋 Resumen de Cambios

Se ha refactorizado el monolítico `App.jsx` de ~800 líneas en una arquitectura modular y escalable usando patrones de desarrollo profesionales.

## 🏗️ Estructura Nueva

```
src/
├── App.jsx (110 líneas - componente orquestador)
├── App.css
├── main.jsx
├── index.css
├── hooks/
│   ├── index.js (barrel export)
│   ├── useAuth.js (autenticación)
│   ├── useMovies.js (películas, vetos, ratings)
│   ├── useSearch.js (búsqueda interna/externa)
│   ├── useLocalLists.js (listas localStorage)
│   └── useNavigation.js (navegación entre pantallas)
├── screens/
│   ├── AuthScreen.jsx (login/registro)
│   ├── SearchScreen.jsx (búsqueda)
│   ├── SharedListScreen.jsx (lista conjunta)
│   ├── MyListsScreen.jsx (mis listas)
│   ├── MovieDetailScreen.jsx (detalle película)
│   ├── ActivityScreen.jsx (actividad)
│   └── LikeModal.jsx (modal de destino)
├── services/
│   ├── api.js (llamadas a API centralizadas)
│   └── localStorage.js (gestión localStorage)
├── utils/
│   └── movieUtils.js (funciones utilitarias)
└── components/ (componentes existentes)
```

## ✨ Patrones Aplicados

### 1. **Custom Hooks** - Separación de lógica de estado
- `useAuth`: Maneja login, registro, logout
- `useMovies`: Datos de películas, ratings, vetos
- `useSearch`: Búsqueda interna/externa
- `useLocalLists`: Persistencia en localStorage
- `useNavigation`: Navegación y feedback de usuario

### 2. **Screen Components** - UI organizada por pantalla
- Cada pantalla es un componente independiente
- Props bien definidas
- Lógica de presentación separada

### 3. **Service Layer** - API centralizada
- `apiCall()`: Función base con autenticación
- Endpoints agrupados por dominio: `authAPI`, `moviesAPI`, `genreVetoAPI`, `logsAPI`
- Gestión de tokens centralizada

### 4. **Utility Functions** - Lógica reutilizable
- `mapMovieToLocal()`: Mapeo de modelos
- `getTodayDate()`: Fecha actual formateada
- `filterMoviesByQuery()`: Búsqueda
- `groupGenreVetoesByGenre()`: Agrupación de datos

## 📊 Comparativa

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Líneas App.jsx** | ~800 | ~110 |
| **Hooks** | 0 | 5 |
| **Servicios** | Inline | Centralizados |
| **Componentes** | 1 monolítico | 7 especializados |
| **Reutilización** | Baja | Alta |
| **Testabilidad** | Difícil | Fácil |
| **Mantenibilidad** | Compleja | Simple |

## 🎯 Beneficios

✅ **Separación de responsabilidades** - Cada módulo hace una cosa bien
✅ **DRY (Don't Repeat Yourself)** - Código reutilizable
✅ **Escalabilidad** - Fácil agregar nuevas pantallas o funcionalidades
✅ **Testabilidad** - Cada hook/servicio puede testearse independientemente
✅ **Mantenibilidad** - Código más legible y ordenado
✅ **Reusabilidad** - Hooks y servicios pueden usarse en otros componentes

## 🔄 Flujo de Datos

```
App.jsx (orquestador)
  ├── useAuth() → Auth state
  ├── useMovies(token) → Movies state
  ├── useSearch() → Search state
  ├── useLocalLists() → Local state
  └── useNavigation() → Navigation state

AuthScreen → api.login/register → setToken → loadData
SearchScreen → api.discover/watchmode → MovieDetailScreen
SharedListScreen → api.veto/rating → LikeModal → addMovie
```

## 📝 Próximos Pasos (Opcional)

1. Agregar PropTypes para validación de props
2. Crear tests unitarios para hooks
3. Agregar error boundaries
4. Implementar lazy loading para screens
5. Agregar más componentes reutilizables

## 🚀 Uso

El comportamiento es exactamente el mismo que antes, pero ahora:
- El código es más mantenible
- Los cambios futuros serán más rápidos
- La reutilización de lógica es más fácil
- El testing es más simple
