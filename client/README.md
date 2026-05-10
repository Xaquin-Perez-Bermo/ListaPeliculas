# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## PWA (instalable en movil)

Esta app esta preparada como PWA para poder instalarse en Android/iOS como una app.

### Requisitos para instalarla

- Servir la app por HTTPS (o localhost en desarrollo).
- Tener el backend accesible en la misma ruta `/api` del dominio publicado.

### Verificar build PWA

```bash
npm run build
```

El build genera:

- `dist/manifest.webmanifest`
- `dist/sw.js`

### Instalacion en movil

- Android (Chrome): abrir la URL y pulsar `Instalar app`.
- iOS (Safari): `Compartir` -> `Anadir a pantalla de inicio`.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
